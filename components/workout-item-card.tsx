import type React from "react";
import type { WorkoutItem } from "@/lib/types";
import PlaceholderImage from "@/components/icons/placeholder-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare } from "lucide-react";

export default function WorkoutItemCard({
  item,
  onEdit,
  onRemove,
  dragHandle,
}: {
  item: WorkoutItem;
  onEdit?: (item: WorkoutItem) => void;
  onRemove?: (item: WorkoutItem) => void;
  dragHandle?: React.ReactNode;
}) {
  const hasActions = onEdit || onRemove;

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {/* Left: info */}
        <div className="flex flex-1 flex-col gap-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {dragHandle}
              <span className="font-semibold leading-tight">{item.exercise.title}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {item.note && (
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-center text-neutral-400 hover:text-neutral-600 cursor-default">
                    <MessageSquare size={14} />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56">{item.note}</TooltipContent>
                </Tooltip>
              )}
              <Badge variant="secondary">
                {item.sets.length} set{item.sets.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
          <ul className="mt-1 flex flex-col gap-0.5 text-sm text-neutral-500">
            {item.sets.map((s, i) => (
              <li key={s.id}>
                Set {i + 1}: {s.reps} reps × {s.weight} lb
              </li>
            ))}
          </ul>
          {item.note && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-neutral-400">
              <MessageSquare size={12} className="mt-0.5 shrink-0" />
              {item.note}
            </p>
          )}
        </div>

        {/* Right: image */}
        <div className="w-28 shrink-0 bg-neutral-100 -my-4">
          {item.exercise.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.exercise.image_url}
              alt={item.exercise.title}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <PlaceholderImage />
            </div>
          )}
        </div>
      </div>

      {hasActions && (
        <CardFooter className="gap-2 border-t pt-3">
          {onEdit && (
            <Button className="flex-1" variant="outline" size="sm" onClick={() => onEdit(item)}>
              Edit
            </Button>
          )}
          {onRemove && (
            <Button
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              variant="outline"
              size="sm"
              onClick={() => onRemove(item)}
            >
              Remove
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
