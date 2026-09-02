TeachAssist+ — GDShipGame Asset Path Hotfix

Fixes the Metro error:
Unable to resolve "../../assets/planes/default.png" from "components/GDShipGame.tsx"

Cause:
GDShipGame.tsx is in the project-root components folder, so assets are one level
up at ../assets, not two levels up at ../../assets.

Corrected all aircraft, Maxwell, and boss asset paths.
No dependency or IPA rebuild is required for Dev/Metro testing.
