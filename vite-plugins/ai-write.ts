import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Plugin } from 'vite'

interface PhotoInput {
  id: string
  role: string
  roleLabel: string
  caption: string
  dataUrl: string
}

interface ReviewFormInput {
  restaurantName: string
  visitYear: string
  visitMonth: string
  hours: string
  parking: string
  priceRange: string
  intro: string
  menuNote: string
  summary: string
  hashtags: string
}

interface RequestBody {
  form: ReviewFormInput
  photos: PhotoInput[]
}

const FORMAT_RULES = `
[블로그 포맷 규칙]
- 네이버 에디터에 붙여넣으면 굵게/글자크기/글자색/정렬/인용구/구분선 외의 스타일은 다 사라진다.
- 인트로: 방문 계기·첫인상, 자연스러운 구어체 한두 문단.
- 메뉴 설명: 메뉴판 사진 아래 들어갈 보조 설명. 짧고 담백하게.
- 총평: 마무리 소감 한 줄~한 문단.
- 해시태그: 쉼표/공백으로 구분된 단어 목록 (# 없이 적어도 됨).
- 사진 캡션: 각 사진 역할(대표/매장/메뉴판/음식/기타)에 맞는 짧은 한 줄.

[SEO 지침]
- 가게 이름을 인트로 첫 문장과 총평에 자연스럽게 노출한다 (억지로 반복하지 않는다).
- 해시태그는 이미 있는 키워드를 다듬어 지역·업종·메뉴 관련 태그를 자연스럽게 보강한다.
- 상투적인 광고 문구, 과장된 수식어, 이모지 남발은 피한다.

[사진 캡션은 실제로 보고 써라]
- 아래 [사진 파일 목록]에 있는 각 파일을 Read 도구로 실제로 열어서 보고 캡션을 써라.
- 실제로 사진에서 확인되는 내용만 쓰고, 안 보이는 디테일(맛 등)은 지어내지 마라.
- 사용자가 이미 캡션을 적어뒀으면 그 내용을 존중해서 다듬기만 하고, 사진에서 보이는
  내용과 충돌하면 사진에서 보이는 사실을 우선한다.
`.trim()

/**
 * Dev-server-only "AI 작성" endpoint. `apply: 'serve'` means this never runs
 * (and the /api/ai-write route never exists) in the production build — it
 * only works while you have `claude` logged in locally and run `npm run dev`.
 * Shells out to `claude -p` so it reuses your existing Claude Code login
 * instead of needing a separate Anthropic API key.
 */
export function aiWritePlugin(): Plugin {
  return {
    name: 'ai-write-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ai-write', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          void handleRequest(body, res)
        })
      })
    },
  }
}

async function handleRequest(body: string, res: import('node:http').ServerResponse): Promise<void> {
  let dir: string | undefined
  try {
    const { form, photos } = JSON.parse(body) as RequestBody
    dir = await mkdtemp(join(tmpdir(), 'ai-write-'))
    const photoFiles = await Promise.all(photos.map((p, i) => writePhotoFile(dir!, p, i)))
    const prompt = buildPrompt(form, photoFiles)
    const text = await runClaude(prompt, dir)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ text }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

interface PhotoFile {
  id: string
  roleLabel: string
  caption: string
  path: string
}

async function writePhotoFile(dir: string, photo: PhotoInput, index: number): Promise<PhotoFile> {
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(photo.dataUrl)
  if (!match) throw new Error(`사진 ${index + 1}의 데이터 형식을 읽지 못했어요.`)
  const [, ext, base64] = match
  const path = join(dir, `photo-${index + 1}.${ext}`)
  await writeFile(path, Buffer.from(base64, 'base64'))
  return { id: photo.id, roleLabel: photo.roleLabel, caption: photo.caption, path }
}

function buildPrompt(form: ReviewFormInput, photoFiles: PhotoFile[]): string {
  const photoLines = photoFiles
    .map((p, i) => `${i + 1}. [${p.roleLabel}] id=${p.id} 파일: ${p.path} 기존 캡션: ${p.caption || '(없음)'}`)
    .join('\n')

  return `당신은 네이버 블로그 맛집 후기 글을 다듬는 편집자입니다. 아래 규칙에 따라 사용자가
대충 적어둔 초안을 다듬으세요.

${FORMAT_RULES}

다듬은 결과는 반드시 아래 JSON 스키마 하나만 출력하세요. 설명, 코드펜스, 그 외 어떤
텍스트도 앞뒤에 붙이지 마세요 — 순수 JSON 객체만 출력합니다.

{
  "intro": string,
  "menuNote": string,
  "summary": string,
  "hashtags": string,
  "captions": { "<사진 id>": string, ... }
}

[가게 정보]
가게 이름: ${form.restaurantName || '(미입력)'}
방문: ${form.visitYear}년 ${form.visitMonth}월
영업시간: ${form.hours || '(미입력)'}
주차: ${form.parking || '(미입력)'}
가격대: ${form.priceRange || '(미입력)'}

[사용자가 적어둔 초안]
인트로: ${form.intro || '(없음)'}
메뉴 설명: ${form.menuNote || '(없음)'}
총평: ${form.summary || '(없음)'}
해시태그: ${form.hashtags || '(없음)'}

[사진 파일 목록 (역할·id·경로·기존 캡션)]
${photoLines || '(사진 없음)'}

captions 객체에는 위 목록에 있는 사진 id에 대해서만, 있는 만큼만 채우세요.`
}

function runClaude(prompt: string, photoDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'claude',
      ['-p', '--allowedTools', 'Read', '--add-dir', photoDir],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    child.on('error', (err) => {
      reject(new Error(`claude 실행 실패: ${err.message} (Claude Code CLI가 설치·로그인되어 있는지 확인하세요)`))
    })
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `claude가 종료 코드 ${code}로 끝났어요.`))
      else resolve(stdout.trim())
    })
    child.stdin.write(prompt)
    child.stdin.end()
  })
}
