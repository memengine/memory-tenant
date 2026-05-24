"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import useSWRInfinite from "swr/infinite";
import { AlertTriangle, GraduationCap, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDomainSchema } from "@/hooks/useDomainSchema";
import {
  type TenantStudentSummary,
  getTenantStudentsPage,
  truncateUserId,
} from "@/lib/api";

function formatDate(value: string | null): string {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function formatExamCountdown(student: TenantStudentSummary): string {
  if (student.days_to_exam === null || student.days_to_exam === undefined) {
    return "No exam date";
  }
  if (student.days_to_exam < 0) {
    return "Exam passed";
  }
  if (student.days_to_exam === 0) {
    return "Today";
  }
  return `${student.days_to_exam} days`;
}

function riskClassName(count: number): string {
  if (count >= 3) {
    return "bg-rose-100 text-rose-700";
  }
  if (count > 0) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

export default function StudentsPage() {
  const { isLoaded, getToken } = useAuth();
  const domain = useDomainSchema();

  const students = useSWRInfinite(
    (
      pageIndex,
      previousPageData: Awaited<ReturnType<typeof getTenantStudentsPage>> | null,
    ) => {
      if (!isLoaded || domain.domainSchema !== "edtech") {
        return null;
      }
      if (previousPageData && !previousPageData.pagination.next_cursor) {
        return null;
      }
      return [
        "tenant-students",
        pageIndex,
        previousPageData?.pagination.next_cursor ?? null,
      ] as const;
    },
    ([, , pageCursor]) =>
      getTenantStudentsPage(getToken, { cursor: pageCursor, limit: 50 }),
    { refreshInterval: 60_000 },
  );

  const rows: TenantStudentSummary[] = (students.data ?? []).flatMap(
    (page) => page.data,
  );
  const lastPage = students.data?.[students.data.length - 1];
  const nextCursor = lastPage?.pagination.next_cursor ?? null;

  if (domain.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-sky-700" />
      </div>
    );
  }

  if (domain.domainSchema !== "edtech") {
    return (
      <div className="flex flex-col gap-6 pt-14 md:pt-0">
        <Card className="border-sky-200 bg-sky-50">
          <CardHeader>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
              <GraduationCap className="size-6" />
            </div>
            <CardTitle>The Students screen is for EdTech tenants.</CardTitle>
            <CardDescription>
              Enable the EdTech schema in Settings to use structured student
              profiles, weak topics, exam countdowns, and forgetting risk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings#domain">Go to Settings -&gt;</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          EdTech
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Students
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Student-specific memory summaries built from the EdTech schema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student memory profiles</CardTitle>
          <CardDescription>
            Grade, exam context, weak topic count, and forgetting risk for each
            active student.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Unable to load students. Try again after confirming EdTech schema
              is enabled.
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Grade + Board</TableHead>
                <TableHead>Exam Countdown</TableHead>
                <TableHead>Weak Topics</TableHead>
                <TableHead>Last Session</TableHead>
                <TableHead>Forgetting Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((student) => (
                  <TableRow key={student.external_user_id}>
                    <TableCell className="font-medium text-slate-900">
                      {truncateUserId(student.external_user_id)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {student.grade_level ?? "Unknown"}
                      {student.board_or_curriculum
                        ? ` | ${student.board_or_curriculum}`
                        : ""}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <div>{formatExamCountdown(student)}</div>
                      {student.exam_name ? (
                        <div className="text-xs text-slate-400">
                          {student.exam_name}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{student.weak_topics_count}</TableCell>
                    <TableCell className="text-slate-600">
                      {formatDate(student.last_session_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${riskClassName(
                          student.forgetting_risk_count,
                        )}`}
                      >
                        {student.forgetting_risk_count === 0
                          ? "-"
                          : student.forgetting_risk_count}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-slate-500"
                    colSpan={6}
                  >
                    {students.isLoading
                      ? "Loading students..."
                      : "No EdTech student profiles yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {nextCursor ? (
            <div className="mt-5 flex justify-center">
              <Button
                variant="outline"
                onClick={() => void students.setSize(students.size + 1)}
                disabled={students.isLoading}
              >
                {students.isLoading ? "Loading..." : "Load more students"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
