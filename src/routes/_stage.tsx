import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useRef } from "react";
import { quizStore, selectState } from "../quiz-store";
import { followUrlTheme, hydrateThemeFromSources } from "../theme/commit";
import { getTheme } from "../theme/registry";
import { validateThemeSearch } from "../theme/search";
import { themeStore } from "../theme/theme-store";
import { UsMap } from "../UsMap";

export const Route = createFileRoute("/_stage")({
  ssr: false,
  validateSearch: validateThemeSearch,
  component: StageLayout,
});

/**
 * Pathless layout: WebGL map stays mounted across `/` and `/settings`.
 * Owns theme hydration (URL → storage → default) and document CSS vars.
 */
function StageLayout() {
  const guesses = useSelector(quizStore, (s) => s.guesses);
  const pick = useSelector(quizStore, (s) => s.pick);
  const scored = useSelector(quizStore, (s) => s.scored);
  const themeId = useSelector(themeStore, (s) => s.id);
  const mapTheme = getTheme(themeId).map;
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const didHydrate = useRef(false);
  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;
    hydrateThemeFromSources(search.theme, {
      replaceThemeSearch: (theme) => {
        void navigate({
          search: (prev) => ({ ...prev, theme }),
          replace: true,
        });
      },
    });
  }, [navigate, search.theme]);

  useEffect(() => {
    if (!didHydrate.current) return;
    if (search.theme) followUrlTheme(search.theme);
  }, [search.theme]);

  return (
    <div className="stage" data-stage-layout>
      <UsMap
        guesses={guesses}
        selectedId={pick?.id ?? null}
        scored={scored}
        mapTheme={mapTheme}
        onSelect={selectState}
      />
      <Outlet />
    </div>
  );
}
