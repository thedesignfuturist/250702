# 프로젝트 규칙 (Rules)

## Typography 사용 가이드

### 목적
- 프로젝트 내 모든 텍스트(제목, 문단, 목록 등)에 일관된 스타일을 적용하기 위해 공통 타이포그래피 컴포넌트를 사용합니다.

### 사용 방법
- 아래 컴포넌트만 사용하여 텍스트를 작성합니다.
- 직접 <h1>, <h2>, <p> 등에 Tailwind 클래스를 붙여 쓰지 않습니다.

### 제공 컴포넌트

| 컴포넌트                | 용도                |
|------------------------|--------------------|
| `TypographyH1`         | 페이지/섹션의 최상위 제목 |
| `TypographyH2`         | 두 번째 수준 제목   |
| `TypographyH3`         | 세 번째 수준 제목   |
| `TypographyH4`         | 네 번째 수준 제목   |
| `TypographyP`          | 일반 문단          |
| `TypographyBlockquote` | 인용구             |
| `TypographyTable`      | 표                 |
| `TypographyList`       | 순서 없는 목록      |
| `TypographyInlineCode` | 인라인 코드        |
| `TypographyLead`       | 리드(강조 문장)    |
| `TypographyLarge`      | 큰 텍스트          |
| `TypographySmall`      | 작은 텍스트        |
| `TypographyMuted`      | 보조 설명          |

### 예시

```tsx
import {
  TypographyH1,
  TypographyP,
  TypographyList,
} from "@/components/typography/Typography"

export default function Example() {
  return (
    <>
      <TypographyH1>타이틀</TypographyH1>
      <TypographyP>문단 내용</TypographyP>
      <TypographyList />
    </>
  )
}
```

### 커스텀 스타일
- 새로운 텍스트 스타일이 필요하면, 반드시 `Typography.tsx`에 추가 후 사용합니다. 

## 12그리드 레이아웃 규칙

- 모든 주요 섹션은 Tailwind의 grid/grid-cols-12로 배치
- 데스크탑(xl): 12그리드, 태블릿(lg): 8그리드, 모바일(md): 6그리드
- 각 요소는 col-span-?으로 칸수 지정
- 반응형은 sm, md, lg, xl 브레이크포인트로 조정
- 컨테이너는 max-w-screen-xl mx-auto로 중앙 정렬
- 예시:

```tsx
import { GridLayout } from "@/components/layouts/GridLayout"

<GridLayout>
  <div className="col-span-12 lg:col-span-8 xl:col-span-6">메인</div>
  <div className="col-span-12 lg:col-span-4 xl:col-span-3">사이드</div>
  <div className="col-span-12 xl:col-span-3">추가 콘텐츠</div>
</GridLayout>
``` 