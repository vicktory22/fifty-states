import { createFileRoute } from "@tanstack/react-router";
import { GameHud } from "../App";

export const Route = createFileRoute("/_stage/")({
  ssr: false,
  component: GameHud,
});
