"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function TestSupabase() {
  const [result, setResult] = useState("로딩 중...");

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase
      .from("images") // 실제 존재하는 테이블명으로 변경 필요
      .select("*")
      .limit(1)
      .then(({ data, error }) => {
        if (error) setResult("에러: " + JSON.stringify(error));
        else setResult("성공: " + JSON.stringify(data));
      });
  }, []);

  return <div style={{ padding: 32, fontSize: 18 }}>{result}</div>;
} 