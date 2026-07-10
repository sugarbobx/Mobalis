import { DefiRunner } from "@/components/student/defi-runner";

export default async function StudentChallengePlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DefiRunner defiId={id} />;
}
