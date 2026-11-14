# P08 device and approved-source checklist

**Status: pending user execution.** Run on a local or authorized test deployment containing migration 0023 and the approved pilot catalog. This commit does not deploy or seed production. Use Hacker Public Radio and LINUX Unplugged at normal listening volume; never load-test publishers. Repeat on physical Android Chrome and iPhone Safari, then the supported desktop matrix from [test matrix](test-matrix.md).

Record device model, OS/browser versions, country/network, commit SHA, show/episode title, date, and pass/fail/observations. Do not include account IDs, session tokens or signed enclosure URLs.

1. Start radio; switch to Podcasts. Open a show, follow it, save an episode, start playback. Confirm only one item is audible and attribution/licence notices remain readable.
2. Seek forward and backward, try −15/+30 seconds and 1.5× speed. Pause/resume. Wait at least 15 seconds, stop, reopen and resume near the saved position. Rewind, pause, reload: confirm the rewind is retained.
3. Queue two different episodes; remove one, add it again, and reach the end of the current episode. Confirm next queued episode starts once and completed status appears after refreshing the episode list/library. Confirm an empty queue stops.
4. Set a five-minute sleep timer. Verify pause while foregrounded; repeat locked/backgrounded and record any OS-induced delay. Test lock/unlock, a call or audio interruption, and headphone/media controls. Record unsupported controls honestly.
5. Switch Wi-Fi to mobile data and back. Record buffering, recovery or actionable errors. Go offline: confirm there is no promise of offline playback, then reconnect and retry.
6. Open the same account on a second device, play the same episode and change position. Let the first device send progress: confirm takeover is reported and its older progress does not overwrite the newer position. Stop/play on the first device to resume the latest state.
7. Use a different account: follows, saves and listening history must be separate. Confirm removing a save in one account leaves the other account unchanged.
8. Disable Podcasts or block a test show through authorized test administration. Confirm playback stops within the foreground policy window (15-second polling plus request time), new playback is denied, saved links remain, and radio still works. Restore test settings.
9. Check compact/mobile layout, keyboard focus, labels and screen-reader control names. Refresh the library to verify follows, saves, progress and completion persist. Repeat with both approved publishers and record startup/seek failures separately.

Return the record in this chat. A headless or simulated test cannot mark these physical-device cells complete. Approved-provider browser evidence and the required P01 measurement sample remain open until recorded; P09 is not ready merely because implementation tests pass.
