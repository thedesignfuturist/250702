import React from "react";

/**
 * 12그리드 기반 반응형 레이아웃 컴포넌트
 * - 데스크탑: 12그리드
 * - 태블릿: 8그리드
 * - 모바일: 6그리드
 *
 * 사용 예시:
 * <GridLayout>
 *   <div className="col-span-12 lg:col-span-8 xl:col-span-6">메인</div>
 *   <div className="col-span-12 lg:col-span-4 xl:col-span-3">사이드</div>
 * </GridLayout>
 */
export function GridLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-6">
        {children}
      </div>
    </div>
  );
} 