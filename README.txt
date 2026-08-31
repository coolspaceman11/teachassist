TeachAssist+ — Ship / Wave / Rain Loop Fix

Fixes:
1. Cozy Ship
   - Uses responder controls instead of Pressable onPressIn/onPressOut.
   - Release is now reliably detected even when the finger moves.
   - Leftover upward momentum is heavily reduced immediately on release.
   - Holding progressively increases upward acceleration.
   - Releasing progressively increases downward acceleration.
   - Switching direction feels much more responsive.

2. Cozy Wave incoming spikes
   - Collision now uses the actual visual center of the spike.
   - Wave spike collision radius is substantially smaller.
   - Spike visual is slightly smaller as well.
   - Near-misses should no longer count as hits.

3. Rainy Focus audio
   - Replaced the MP3 loop with a PCM WAV prepared as a seamless circular loop.
   - The final 0.75 seconds crossfade into the first 0.75 seconds.
   - This removes MP3 encoder padding and the audible silent gap at loop restart.
   - Existing timer pause/stop behavior is preserved.

No new npm/native dependency is introduced by this patch.
The WAV is larger than the MP3 because it is uncompressed; this is intentional for gapless looping.
