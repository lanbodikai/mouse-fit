# Mouse Fit hand assets

- `hand-v1.glb` is an indexed GLB conversion of the user-supplied `12683_hand_v1_FINAL.obj` archive.
- The source OBJ contains a single static mesh and no skeleton, bones, morph targets, textures, or license file.
- This asset is retained for reference but is no longer rendered by the simulator.
- The simulator now builds a continuous procedural skin over fixed-length articulated fingers. `articulated-hand.ts` solves contacts against the fitted mouse surface and `hand-surface.ts` generates the skin.
- One world unit is one centimeter. Hand length is wrist crease to middle fingertip with the fingers extended; bending changes reach, not bone lengths. A 17 cm hand uses a 9.5 cm palm and 7.5 cm middle finger.
- The hand is a simplified size/grip visualization, not a personalized anatomical scan or a biomechanical fit assessment.
