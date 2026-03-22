import { useParams, useNavigate } from "react-router-dom";
import { useGig, useUpdateGig } from "@/api/hooks";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowLeft } from "lucide-react";

export default function EditGig() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: gig, isLoading } = useGig(id!);

  if (isLoading) return <div className="px-4 pt-4"><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!gig) return null;

  // Redirect to a simplified edit form
  // In production, reuse CreateGig with pre-filled data
  navigate(`/gig/create`);
  return null;
}
