# CMS draft recovery

## Download a copy

On an existing editable case study, click **Download draft backup**. The JSON contains the project ID, current concurrency baseline, metadata, SEO, cover UUID and complete nested blocks. The download uses the live editor state and needs no upload or save. It contains private draft content. Keep it in a private location.

## Enable snapshots on a private device

Open **Draft recovery** and choose **Enable browser recovery**. Unsaved edits are written after 750 ms of inactivity, with a best-effort flush when the page becomes hidden or is left. Snapshots are scoped by authenticated account, project and editor tab. The browser stores a maximum of twelve snapshots of up to 250,000 UTF-8 bytes each. The expiry is 24 hours after the last snapshot write. Expired entries are removed when the editor next checks the storage. Confirmed saves clear the current tab's snapshot. Other tab snapshots can be reviewed or explicitly discarded.

On a fresh visit, choose **Review snapshot** to compare the backup against the current stored draft. **Apply backup to editor** changes the open form only. Review the canvas and click **Save Draft** separately. A version change since comparison can still result in a conflict.

Application sign-out asks for confirmation and clears recovery snapshots and opt-ins in that browser profile. Disabling recovery removes that account's snapshots and opt-in. Same-origin scripts and people with access to the profile may access local browser data. Other devices require the exported file. Device loss, blocked or cleared storage, loss before the first snapshot, and sudden process termination can prevent recovery. This feature is a local convenience; keep downloaded copies for important work.

## Import a file

1. Open the same editable project. Choose **Import draft backup** and select the JSON file. Use **Download draft backup** first if the open editor has other unsaved changes.
2. The authorized server validates the project ID, metadata, safe block schemas, nesting, unique IDs and current private media. The selected file reaches the CMS server for this read-only validation. Review the changed fields and both versions of the block document.
3. For an older or unversioned Stage 7.4.1 backup, explicitly acknowledge the version difference. Choose **Apply backup to editor** and inspect the result. Use **Save Draft** to send the normal authorized, version-checked transaction.
4. A missing asset or incompatible format blocks import. A snapshot containing incomplete or invalid edits can still be downloaded for manual recovery. If the stored version changes, keep the backup and review the latest draft before another import.

Use the downloaded backup when storage is blocked or full. An administrator session is required to validate a recovery candidate. A local backup or snapshot cannot publish a revision.
