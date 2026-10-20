import { installSoundLifecycle, playSound, unlockSounds } from './audio/sounds';

/** Quiet feedback shared by buttons, including controls rendered after navigation. */
export function installButtonClickSound(): () => void {
  const dispose = installSoundLifecycle();

  function onClick(event: MouseEvent) {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const button = event.target.closest('button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]');
    if (!button) { void unlockSounds(); return; }
    if (button.matches(':disabled') || button.closest('[aria-disabled="true"], [inert]')) return;
    void playSound('click', true);
  }

  // Capture before a button's handler can remove or disable the clicked element.
  document.addEventListener('click', onClick, true);
  return () => {
    document.removeEventListener('click', onClick, true);
    dispose();
  };
}
