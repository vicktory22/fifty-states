import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { commitTheme } from "../theme/commit";
import { listThemesByFamily } from "../theme/registry";
import { validateThemeSearch } from "../theme/search";
import { themeStore } from "../theme/theme-store";
import type { ThemeDefinition, ThemeId } from "../theme/types";

export const Route = createFileRoute("/_stage/settings")({
  ssr: false,
  validateSearch: validateThemeSearch,
  component: SettingsPage,
});

const FAMILY_GROUPS = listThemesByFamily();

function SettingsPage() {
  const activeId = useSelector(themeStore, (s) => s.id);
  const navigate = useNavigate({ from: Route.fullPath });

  function selectTheme(id: ThemeId) {
    commitTheme(id, {
      replaceThemeSearch: (theme) => {
        void navigate({
          search: (prev) => ({ ...prev, theme }),
          replace: true,
        });
      },
    });
  }

  function closeSettings() {
    void navigate({ to: "/", search: (prev) => prev });
  }

  return (
    <div
      className="settings-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={closeSettings}
    >
      <div
        className="settings-panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="settings-panel-head">
          <div>
            <div className="kicker">Settings</div>
            <h2 id="settings-title">Theme</h2>
          </div>
          <Link to="/" search={true} className="btn ghost settings-back">
            Back
          </Link>
        </div>

        <p className="settings-copy">Pick a look. The map updates live underneath.</p>

        <div className="theme-catalog" role="listbox" aria-label="Theme presets">
          {FAMILY_GROUPS.map((group) => (
            <section key={group.family} className="theme-family">
              <h3 className="theme-family-label">{group.family}</h3>
              <ul className="theme-grid">
                {group.themes.map((theme) => (
                  <li key={theme.id}>
                    <ThemeOption
                      theme={theme}
                      active={theme.id === activeId}
                      onSelect={selectTheme}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="settings-attrib">
          Palettes inspired by Tokyo Night, Catppuccin, Rosé Pine, Nord, One Dark, Dracula, and
          Gruvbox.
        </p>
      </div>
    </div>
  );
}

function ThemeOption({
  theme,
  active,
  onSelect,
}: {
  theme: ThemeDefinition;
  active: boolean;
  onSelect: (id: ThemeId) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={`theme-option${active ? " is-active" : ""}`}
      onClick={() => onSelect(theme.id)}
    >
      <span className="theme-swatches" aria-hidden>
        <i style={{ background: theme.css.ink }} />
        <i style={{ background: theme.css.line }} />
        <i style={{ background: theme.css.right }} />
      </span>
      <span className="theme-option-label">{theme.label}</span>
    </button>
  );
}
