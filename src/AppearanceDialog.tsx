import { Check, Monitor, Moon, Palette as PaletteIcon, Sun, X } from "lucide-react";
import { Modal } from "./Modal";
import { APPEARANCES, PALETTES, type ThemePreference } from "./theme";

type Props = {
  readonly preference: ThemePreference;
  readonly onChange: (preference: ThemePreference) => void;
  readonly storageAvailable: boolean;
  readonly onClose: () => void;
};
const appearanceIcons = { light: Sun, dark: Moon, system: Monitor };

export function AppearanceDialog({ preference, onChange, storageAvailable, onClose }: Props) {
  return <Modal title="Appearance" className="appearance-dialog" onClose={onClose}>
    <header className="modal-header"><div><span className="eyebrow">Make it yours</span><h2>Appearance</h2></div><button className="icon-button" aria-label="Close appearance" onClick={onClose}><X size={20} /></button></header>
    <div className="appearance-content">
      <p className="dialog-description">Choose a comfortable workspace. Changes apply immediately.</p>
      <fieldset className="theme-fieldset"><legend>Color theme</legend><div className="palette-options">
        {PALETTES.map((palette) => <label key={palette} className={`palette-option palette-${palette}`}>
          <input type="radio" name="palette" value={palette} checked={preference.palette === palette} onChange={() => onChange({ ...preference, palette })} />
          <span className="palette-preview" aria-hidden="true"><i /><i /><i /></span>
          <span className="palette-name">{palette}<Check size={16} className="selection-check" /></span>
        </label>)}
      </div></fieldset>
      <fieldset className="theme-fieldset"><legend>Display mode</legend><div className="appearance-options">
        {APPEARANCES.map((appearance) => {
          const Icon = appearanceIcons[appearance];
          return <label className="appearance-option" key={appearance}><input type="radio" name="appearance" value={appearance} checked={preference.appearance === appearance} onChange={() => onChange({ ...preference, appearance })} /><Icon size={20} /><span>{appearance}</span><Check size={16} className="selection-check" /></label>;
        })}
      </div></fieldset>
      <div className="theme-sample"><div><PaletteIcon size={18} /><strong>Your workspace preview</strong><span className="risk-level risk-low">On track</span></div><div className="sample-track"><span /></div><p>Clear text, calm surfaces, and a color that feels right.</p></div>
      <p className="theme-save-note" role="status">{storageAvailable ? "Your preference is saved on this browser." : "Browser storage is unavailable. This theme will last for this session."}</p>
    </div>
    <footer className="modal-actions"><button className="text-button primary" onClick={onClose}>Done</button></footer>
  </Modal>;
}
