import type React from "react";
import type { WorkoutItem } from "@/lib/types";
import PlaceholderImage from "@/components/icons/placeholder-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card className="pt-0 overflow-hidden">
      <div className="relative h-28 w-full">
        {dragHandle && (
          <div className="absolute left-2 top-2 z-10">{dragHandle}</div>
        )}
        {item.exercise.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.exercise.image_url}
            alt={item.exercise.title}
            className="h-full w-full object-cover brightness-90"
          />
        ) : (
          <div className="h-full w-full bg-neutral-100 flex items-center justify-center">
            <PlaceholderImage />
          </div>
        )}
      </div>
      <CardHeader>
        <CardAction>
          <Badge variant="secondary">
            {item.sets.length} set{item.sets.length !== 1 ? "s" : ""}
          </Badge>
        </CardAction>
        <CardTitle>{item.exercise.title}</CardTitle>
        <CardDescription>
          <ul className="flex flex-col gap-0.5">
            {item.sets.map((s, i) => (
              <li key={s.id}>
                Set {i + 1}: {s.reps} reps × {s.weight} lb
              </li>
            ))}
          </ul>
        </CardDescription>
      </CardHeader>
      {hasActions && (
        <CardFooter className="gap-2">
          {onEdit && (
            <Button className="flex-1" variant="outline" size="sm" onClick={() => onEdit(item)}>
              Edit
            </Button>
          )}
          {onRemove && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemove(item)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Remove
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
