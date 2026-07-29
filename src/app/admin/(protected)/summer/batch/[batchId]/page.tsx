import { redirect } from "next/navigation";

export default async function BatchIndexPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  redirect(`/admin/summer/batch/${batchId}/overview`);
}