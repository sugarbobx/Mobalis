import { ExerciseRunner } from "@/components/student/exercise-runner";

export default async function StudentExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExerciseRunner assignationId={id} />;
}
