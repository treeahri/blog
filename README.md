# 맛집 후기 템플릿 도구

사진과 코멘트를 입력하면 고정된 맛집 후기 템플릿에 맞춰 자동 배치하고, **"한 번에 복사" 버튼 하나로 글+사진을 네이버 스마트에디터에 그대로 붙여넣게** 해주는 모바일 웹앱.

- React 19 + TypeScript + Vite + Tailwind 4
- 백엔드 없음 (모든 처리는 브라우저에서, GitHub Pages로 정적 배포)

## 어떻게 동작하나

1. 가게 정보·사진·코멘트를 폼에 입력 → 템플릿 미리보기에 실시간 반영
2. **한 번에 복사**를 누르면:
   - 사진을 본인 GitHub 공개 저장소(`본인아이디/blog-image`)에 순차 업로드해 공개 URL 확보
   - 그 URL이 담긴 네이버 호환 HTML을 클립보드에 복사
3. 네이버 글쓰기 에디터에 **붙여넣기 한 번** → 글과 사진이 순서대로 들어감
4. 발행 후 **"저장소 사진 전체 정리"** 버튼으로 업로드했던 사진을 삭제(히스토리까지 초기화)

> 네이버는 붙여넣은 HTML 안의 공개 http 이미지 URL은 가져와 첨부하지만, base64(data URI) 이미지는 거부한다. 그래서 사진을 잠시 공개 저장소에 올렸다가 발행 후 지우는 구조다.

## 처음 사용 설정 (사용자별 1회)

앱은 각자 **본인 GitHub 저장소 + 본인 토큰**을 쓴다. 토큰은 그 사람 브라우저(localStorage)에만 저장되고 서버로 전송되지 않는다.

1. 본인 GitHub에 공개 저장소 `blog-image` 생성
2. [fine-grained PAT 발급](https://github.com/settings/personal-access-tokens/new)
   - Repository access → Only select repositories → `blog-image`
   - Permissions → Contents → **Read and write**
3. 앱 첫 화면의 GitHub 설정에 **아이디 / 저장소 이름 / 토큰** 입력

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 타입체크 + 프로덕션 빌드
npm run lint     # oxlint
```

## 배포 (GitHub Pages)

`main` 브랜치에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 자동으로 빌드해 Pages에 배포한다.

- 최초 1회만: 저장소 **Settings → Pages → Source = `GitHub Actions`** 로 지정
- 배포 URL: `https://<계정>.github.io/blog/` (경로는 `vite.config.ts`의 `base`와 저장소 이름이 일치해야 함)

## 구조

```
src/
  App.tsx                     전체 레이아웃
  components/
    ReviewForm.tsx            후기 입력 폼
    PhotoUploader.tsx         사진 업로드
    PhotoList.tsx             사진 목록 · 역할/순서 편집(드래그)
    TemplatePreview.tsx       네이버 붙여넣기 결과 미리보기
    ExportPanel.tsx           내보내기 패널
    OneShotCopySection.tsx    "한 번에 복사" + GitHub 업로드/정리
  lib/
    export.ts                 템플릿 → 텍스트/HTML 변환 (단일 소스)
    github.ts                 GitHub 업로드 · 사진 전체 정리(히스토리 초기화)
    image.ts                  이미지 변환 유틸
    draftStorage.ts           초안 자동 저장(IndexedDB)
```
