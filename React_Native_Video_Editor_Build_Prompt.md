# React Native CLI video editor build prompt

Act as a senior React Native engineer and native mobile media engineer. Build a complete CapCut-style video editing product named **ClipForge**. Treat this as a functional software project, not a UI mockup. Create the actual repository, native integrations, editing engine, persistence, tests and setup documentation.

Use an original interface and original or appropriately licensed assets. The goal is comparable editing workflows and broad feature coverage. Do not claim that CapCut's proprietary models, music catalogue or templates are included.

## 1. Required platform and implementation approach

- Use **bare React Native CLI**, TypeScript and strict type checking. Generate and maintain the real `android/` and `ios/` projects.
- Use React Navigation for navigation, Redux Toolkit for serializable app/editor state, and an appropriate maintained gesture/animation stack for responsive editing interactions.
- Verify the current stable React Native release and compatible React, navigation, animation, storage, billing and ads versions against primary documentation. Pin the versions actually selected and commit one package-manager lockfile. Document Node, Java, Android SDK/NDK, Gradle, Xcode and CocoaPods requirements. Avoid copying unrelated version combinations.
- Support the selected React Native release's native architecture. Implement typed native-module specifications and Codegen registration. Use a native preview view when appropriate.
- Keep media decoding, compositing, audio processing, preview and export in a native engine. JavaScript manages the editing model and UI. Do not send full-resolution frames through Redux or the JS event loop.
- For Android, evaluate Media3/ExoPlayer/Transformer plus custom compositor, shader and audio-processing implementations. For iOS, use AVFoundation with the necessary compositor, Core Image or Metal components.
- Check actual framework limitations before choosing implementations. Media3 Composition currently documents a crossfade limitation: implement and test a suitable compositor or alternate rendering path for transitions rather than assuming a nonexistent built-in API.
- If FFmpeg is needed for operations such as reverse, specialised filters or format support, select and verify a maintained build path and its distribution licence. The original FFmpegKit is retired; its author identifies FFmpegKitNext as a source-only continuation. Do not depend on unavailable historical binaries or substitute an unverified fork.
- The core editor must work offline without an account or an app backend. Store projects and files locally. Cloud-dependent features belong behind optional service adapters. Include their real implementation path and setup requirements, while keeping the offline editor usable when they are unconfigured.
- Implement Android and iOS source code. Bring Android to the first fully tested milestone, then verify the corresponding iOS paths. If the environment lacks Apple build tools, say which iOS checks remain unexecuted instead of claiming a successful build.

## 2. Product interface and screen structure

Create an original professional dark editing interface with clear controls, accessible touch targets, readable text, safe-area handling and responsive layouts. Use a coherent token system for colours, spacing, radii and typography.

Keep the main product to approximately eight screens, with editor tools exposed through reusable panels and sheets:

1. **Home:** local drafts, recent projects, thumbnails, new project, duplicate, rename and delete.
2. **Media picker:** user-selected videos, photos and audio; multi-select; metadata; thumbnail previews and selection order.
3. **Editor:** native preview, canvas, timeline, playhead, time ruler, track controls, undo/redo and contextual editing panels.
4. **Templates/assets:** bundled templates, fonts, stickers, filters and sounds. Optional online catalogue when enabled.
5. **Export:** supported resolution, frame rate, quality, estimated size, destination and export progress.
6. **Export result:** play, save, share and return to editing.
7. **Settings:** preferences, storage cleanup, model management, restore purchases, privacy and help.
8. **Premium:** genuine store products, entitlement status and purchase/restore actions.

Editing panels include clip controls, crop, transform, speed, transitions, text, subtitles, stickers, audio, effects, filters, masks, keyframes, background tools and AI tools. Panels should preserve selection and editing state. Do not create an unrelated full screen for every slider.

## 3. Folder structure and responsibilities

Use feature-oriented folders and a separate media-engine package. Include actual configuration files and working imports. Add files within these folders as required, keeping responsibilities narrow.

| Path | Responsibility |
|---|---|
| `android/` | Generated Android app project, manifest, build configuration and application registration |
| `ios/` | Generated iOS app project, plist, entitlements, Podfile and application registration |
| `src/app/` | App entry, providers, bootstrap, error boundary and startup recovery |
| `src/navigation/` | Typed routes, navigation configuration and deep-link handling |
| `src/features/projects/` | Home screen, project CRUD, thumbnails and project repository |
| `src/features/media/` | Media selection, import, metadata, permissions and source-file management |
| `src/features/editor/screens/` | Editor screen and layout composition |
| `src/features/editor/components/` | Editor-specific canvas controls, toolbar and transport controls |
| `src/features/editor/timeline/` | Tracks, ruler, playhead, waveforms, thumbnails, zoom and snapping |
| `src/features/editor/panels/` | Clip, text, audio, speed, effects, masks, captions and keyframe panels |
| `src/features/editor/commands/` | Validated edit commands, history, transactions and undo/redo |
| `src/features/export/` | Export settings, job state, progress, cancellation and result screen |
| `src/features/assets/` | Bundled asset catalogue, template selection and template application |
| `src/features/ai/` | Local inference adapters, optional cloud adapters and result-to-project integration |
| `src/features/cloud/` | Optional account, project sync, cloud assets and sharing workflows |
| `src/features/monetization/` | Ads, purchases, product catalogue and entitlement handling |
| `src/domain/` | Project schema, media/track/clip/effect models, migrations and validation |
| `src/engine/` | Platform-independent composition compiler, capabilities and engine adapter |
| `src/services/` | Local database, files, cache, permissions, network and background-job services |
| `src/store/` | Redux store, feature reducers, typed hooks and persistence coordination |
| `src/components/` | Shared buttons, sheets, sliders, colour picker, dialogs and other UI primitives |
| `src/theme/` | Design tokens, typography and theme helpers |
| `src/config/` | Public app configuration, feature flags and provider selection |
| `src/utils/` | Small pure helpers for time, units, filenames and formatting |
| `packages/media-engine/src/` | Public typed native-engine API, native component bindings and event types |
| `packages/media-engine/specs/` | Codegen native-module and preview-view specifications |
| `packages/media-engine/android/` | Kotlin/C++ engine code, shaders, rendering/export pipeline and Gradle configuration |
| `packages/media-engine/ios/` | Swift/Objective-C++ engine code, compositors, rendering/export pipeline and podspec |
| `assets/` | Original/licensed fonts, effects, stickers, sounds, templates and small demo fixtures |
| `tests/` | Critical domain, integration, native rendering and end-to-end tests |
| `scripts/` | Setup checks, Codegen, fixture generation and build/verification scripts |
| `docs/` | Architecture, setup, feature coverage, native compatibility and verification results |
| `backend/` | Optional cloud/AI/billing gateway and worker source, isolated from offline editing |

Use names such as `EditorScreen.tsx`, `ProjectRepository.ts`, `EditorCommand.ts`, `ProjectCompiler.ts`, `MediaEngineAdapter.ts` and `ExportJobService.ts` where they reflect the actual responsibility. Avoid giant screens, circular imports, duplicate project models and untyped catch-all utilities. Shared domain code must not import screens or navigation.

## 4. Canonical editing model

Define one versioned, serializable project schema and validate it at import, persistence and native-engine boundaries. Include:

- Project ID, schema version, title, timestamps, canvas aspect ratio, background, duration, rational frame rate and export defaults.
- Source assets with stable IDs, local references, type, dimensions, duration, rotation, audio metadata and import status.
- Ordered video, image, audio, text, caption, sticker and adjustment tracks. Include mute, visibility, lock and layer-order state.
- Clips with source-in/source-out positions, timeline start, duration, speed mapping, transform, opacity, crop, effects and transitions.
- Keyframes with property, time, value, easing and interpolation rules.
- Text styling, font references, caption timings, masks and audio envelopes.
- Derived asset references for reverse, optical-flow processing, AI output and proxies.

Use a documented canonical time unit such as integer microseconds and explicit conversion at platform boundaries. Preserve frame-rate accuracy and account for variable-frame-rate inputs. Do not mix seconds, milliseconds, source time and timeline time implicitly.

Keep edits non-destructive. Persist source references and editing instructions, not repeatedly re-encoded intermediate videos. Use a command model that supports grouped gestures, undo/redo, clear redo-on-new-edit behaviour and immutable validated state changes.

Store project metadata/instructions in a maintained local database or atomic versioned files. Settings may use an appropriate lightweight store. Files belong in the file system. Keep native handles, players, large binaries, thumbnails and gesture-frame updates out of Redux.

## 5. Required feature catalogue

Implement every group below through the shared editing model and rendering pipeline. Keep a feature matrix with Android, iOS, preview, export, offline/model/provider requirements and verification evidence. Do not silently remove difficult features or label a UI control as implemented before its effect can be exported.

### A. Projects and importing

Create, open, rename, duplicate and delete projects. Autosave with crash recovery. Import multiple local videos/photos/audio files, preserve selection order, inspect metadata, generate thumbnails/waveforms, handle inaccessible sources and relink missing files. Support local project package export/import with schema validation and asset inclusion options. Use an original project format; do not claim CapCut project-file compatibility.

### B. Timeline and transport

Multi-track timeline, zoom, horizontal scrolling, thumbnails, waveforms, scrub, frame stepping, play/pause, snapping and clip selection. Support trim handles, split at playhead, reorder, duplicate, delete, ripple operations, gaps, layer ordering, locking, hiding and muting. Drag gestures must commit valid commands. Undo/redo must restore the complete edit, not only the visual slider.

### C. Clip, canvas and transforms

Trim, split, merge, crop, rotate, flip, fit/fill, opacity, position, scaling and picture-in-picture. Canvas ratios include 9:16, 16:9, 1:1 and custom supported dimensions. Add solid, image and blurred backgrounds, freeze frames and reverse processing. Transform editing must have predictable coordinate systems and safe bounds.

### D. Speed and timing

Constant speed changes, speed curves, freeze sections, slow/fast motion and optional optical-flow slow motion. Define the relationship between source time, output duration, keyframes and audio. Support pitch-preserving tempo changes where implemented. Optical flow needs a real tested local/native algorithm or a clearly configured provider; duplicated frames do not count as optical flow.

### E. Text and subtitles

Add multiple text layers, imported fonts, sizes, colours, gradients where supported, outlines, shadows, backgrounds, alignment, spacing, positioning and entrance/exit animation. Include manual subtitles, SRT import/export, editable caption timings and caption styles. Render text and subtitle styling in exported video. Do not rely on React Native overlays that disappear during export.

### F. Stickers and overlays

Bundled and user-imported images, stickers, logos and supported animated overlays. Implement scale, rotate, position, opacity, timing, keyframes and appropriate blend modes. Add arrows/shapes useful for creator annotations. Preserve transparency correctly through preview and export.

### G. Audio

Import local music, record voiceover with microphone permission, extract audio, detach clip audio, trim/split/mix tracks, mute, gain, fades and ducking. Include waveform display, basic equalisation, pitch/voice effects, loudness normalisation and noise cleanup with actual algorithms or model adapters. Prevent clipping and maintain audio/video sync. Supply only licensed/original bundled sounds and provide user-file import for music.

### H. Transitions, effects and colour

Cuts, crossfades, fades, slides, wipes, zoom transitions and a documented initial transition catalogue. Correctly calculate overlap duration and audio transition behaviour. Include useful filters and adjustable exposure/brightness, contrast, saturation, temperature, tint, highlights, shadows, vignette and sharpening. Add LUT support and effects such as blur/glitch where supported. Build real shaders or compositor operations with parameters, rather than decorative thumbnails.

### I. Keyframes, masks and tracking

Keyframe position, scale, rotation, opacity, supported effect parameters and audio gain. Provide easing curves and an editable keyframe UI. Implement rectangular, circular and freehand masks with feather/invert controls where supported. Implement motion tracking through a tested algorithm/model and turn tracking results into editable keyframes. Add chroma key with colour selection, threshold, feather and spill controls.

### J. Stabilisation and enhancement

Implement a tested stabilisation path with clear crop/quality trade-offs. Include background cutout/removal, portrait segmentation and supported enhancement operations through real adapters. Do not present resizing as AI super-resolution or simple zoom as stabilisation. Treat low-memory/device limitations as capability conditions with helpful user-facing feedback.

### K. Captions, smart editing and generation

Implement automatic caption generation for explicitly supported languages, caption correction, optional caption translation, text-to-speech, beat detection, silence detection and automatic clip arrangement. Include script-to-video assembly and image/video generation through configured providers where local generation is impractical. Generated media must enter the same asset/project pipeline as imported media.

Prefer bundled/local inference for feasible tasks. Downloaded model packs must have verified integrity, versioning, size information, progress, cancellation and cleanup. Mark a task offline-capable only when its required model is actually available locally. Do not upload user media as a silent fallback.

### L. Templates and assets

Define real versioned template files with replaceable media slots, duration rules, fonts, transitions, effects and asset dependencies. Template application creates an editable project. Include a useful small original/licensed starter library, local favourites and user-imported assets. Optional online assets/templates need a real catalogue and download/cache path. A template preview alone is not a completed template feature.

### M. Preview and export

Preview and export must use the same composition interpretation. Include supported MP4/H.264/AAC export, resolution choices, quality/bitrate controls and supported frame rates. Add higher-resolution, HEVC and HDR paths only when platform capabilities are verified. Supply 1080p as the initial reliable baseline.

Implement progress, cancellation, storage preflight, temporary-file cleanup, export retry, error recovery, save-to-gallery and native sharing. Support queueing exports through serialized project snapshots so later edits cannot change an active job. Write final outputs atomically. Unsupported export settings must be blocked with a useful explanation, not accepted and silently changed.

## 6. Complete linking and feature wiring

Wire the complete flow: Home → Media picker → imported assets → Editor → project edits → autosave → Export → saved output → share/result → reopen project.

For each tool, document and implement:

**UI action → validated edit command → canonical project change → preview update → persisted project → equivalent exported output.**

Handle clip selection, toolbar state, sheet dismissal, undo/redo, project switching, navigation back and unsaved/import-in-progress conditions. Changing projects must not reuse the previous project's native player or export callbacks.

Provide typed route parameters using stable project/template/job IDs. Implement custom-scheme deep links such as `clipforge://project/<id>` and template/export routes. Handle cold starts, background opens, invalid IDs and missing local projects. Add Android intent filters and iOS URL types. Domain-based app/universal links require an actual configured domain; do not invent one.

Implement the media engine as a correctly registered local React Native package, with Codegen configuration, typed JS API, platform source, Android dependency registration/autolinking and iOS podspec/provider registration. Include actual permissions and native build settings. Running `pod install` must resolve the real package.

The engine contract must cover capability detection, source probing, thumbnails/waveforms, loading/updating a compiled composition, seek/play/pause, frame stepping, preview events, export start/progress/cancel, supported formats and resource disposal. Define unique request/job IDs, cancellation semantics, error codes and versioned DTOs. Throttle progress events while keeping native rendering smooth.

Implement a composition compiler that is independent of screen layout. No fake native module, nonexistent API call, TODO body, simulated export timer or player-only filter can satisfy a rendering feature.

## 7. Offline storage, privacy and performance

Use system media pickers and scoped permissions. Resolve Android content URIs and iOS picker references correctly, including limited-library access and assets unavailable locally. Copy or retain sources using a documented strategy. Do not assume every URI is a readable filesystem path.

Use bounded, reference-aware caches for thumbnails, proxies, waveforms, models and intermediate assets. Cleanup must not delete assets referenced by saved projects or active exports. Handle app backgrounding, low storage, permission denial, interruption, corrupt media and export cancellation.

Use proxy previews and background native jobs where necessary. Virtualise long timelines. Keep gesture-frame updates off normal Redux render cycles. Measure memory, startup, timeline responsiveness, seek latency, export duration and sync accuracy on actual target devices. Verify orientation, frame rate, colour handling and audio timestamps.

Core editing works without login or network. Cloud uploads require an explicit user action and progress/cancel controls. Keep tokens in platform-secure storage, service secrets on the server and raw media/credentials out of logs. Errors shown in the product must describe the user's problem, not native implementation details.

## 8. Optional backend and external services

Full cloud AI, accounts, cross-device sync, online template distribution and secure remote purchase verification may require services. Implement them in the isolated optional `backend/` package and typed client adapters. Keep the default offline editor independent of them.

Use a small TypeScript Node service with a documented database/object-storage choice and a worker for long-running jobs. Include authenticated routes for cloud projects/assets, AI job submission/status/cancellation and billing verification. Add bounded uploads, signed storage access, account ownership checks, idempotency, rate limits, job timeouts and media retention/deletion rules.

Connect each supported AI provider using its verified SDK/API. Include honest `.env.example` files, setup documentation and actual adapter logic. Do not put provider secrets in the mobile app. Missing credentials/models must produce explicit unavailable/not-configured capability states rather than fabricated successful responses. Document exactly what is needed to enable each cloud feature.

Build authentication/account linking so users can adopt cloud features without losing existing local projects. Sync requires conflict handling and resumable asset transfer. If user-published templates are implemented, include access controls and moderation/reporting workflows.

## 9. Monetisation

Implement a configurable free/Pro feature policy, genuine store product loading, purchase, restore and entitlement refresh. Verify the current Android and iOS billing requirements and document the receipt/transaction verification approach. Preserve appropriately cached entitlements for offline editing and distinguish pending, failed and revoked purchases.

Use a maintained AdMob integration with official test IDs in development, correct native app-ID configuration and clearly documented production settings. Keep advertising outside sensitive editing interactions and active export operations. Do not use fabricated purchases, invalid IDs or a paywall that silently unlocks features without a real transaction.

Use an ads-only development mode or clearly labelled sandbox billing when real store products are not configured. Do not expose test purchases as a production paid feature. Include relevant privacy/consent and store configuration steps after checking the current official requirements.

## 10. Implementation milestones and working method

Inspect the repository before changing it and preserve unrelated existing work. If starting from an empty folder, scaffold the real CLI app and local engine package. Then work through these milestones:

1. **Foundation and real vertical slice:** dependency compatibility, CLI/native builds, import one video, trim it, add a text layer, preview and export an actual MP4, then reopen the saved draft.
2. **Project/timeline system:** local repository, schema validation/migrations, multi-track timeline, commands, autosave, recovery and undo/redo.
3. **Core editing:** transforms, audio, text, stickers, basic colour/effects and matching native preview/export.
4. **Advanced rendering:** transitions, speed curves, keyframes, masks, chroma key, tracking, stabilisation and supported enhancement paths.
5. **AI and templates:** real local/provider adapters, model management, captions, smart editing, generation and editable templates.
6. **Cloud and monetisation:** optional service package, sync/catalogue, billing, ads and complete cross-feature wiring.
7. **Release verification:** Android/iOS build checks, rendering correctness, device tests, recovery, performance and release documentation.

Keep implementing beyond the architecture description. If the task spans sessions, maintain `docs/PROGRESS.md` with completed work, verification evidence, blockers and the exact next action. Resume from that checkpoint. Do not repeatedly regenerate the scaffold or lose already completed native work.

At each milestone, deliver a buildable vertical slice and run applicable checks. A milestone demonstration is not permission to silently omit later requested features. External credentials/hardware/build-tool limitations must be recorded precisely.

## 11. Acceptance checks

Verify critical behaviour using original/generated fixture media and actual rendered outputs:

- Import video/image/audio, assemble a multi-track project, save, close and reopen it with equivalent state.
- Trim/split/reorder clips; confirm duration and edit history, including speed changes and undo/redo.
- Confirm text, overlays, transforms, filters, masks, transitions and keyframes affect both preview and export at representative timestamps.
- Mix two audio tracks, exercise gain/fades/ducking and measure audio/video sync across the output.
- Test imported media with rotation, variable frame rate, no audio, unsupported encoding and missing sources.
- Apply a template, replace its media and export the resulting editable project.
- Generate captions through a real available model/provider, correct them, and preserve/export timings and styling.
- Check cancel/retry, low storage, denied permissions, app interruption and partial-output cleanup.
- Test a project deep link on cold and warm starts, including an invalid project ID.
- Verify offline core editing with networking disabled. Confirm cloud actions clearly require the configured service without breaking local work.
- Verify billing sandbox/restore and test ads when those integrations are configured.
- Run TypeScript, lint, meaningful domain/integration tests, Android debug/release builds and available iOS build checks.

Use real instrumentation or explain the unexecuted test environment. Do not claim cross-device, export or iOS success from TypeScript checks alone. Feature status must distinguish implemented, verified, not yet verified and blocked by a named dependency. Keep engineering readiness reports in documentation, not in the customer editing flow.

## 12. Required deliverables

Provide the full repository with functional screens, typed models, local storage, real native engine code, optional backend source, assets and configuration. Include:

- Exact installation, Codegen, CocoaPods, Android/iOS run and release-build commands for the chosen versions.
- A working folder structure and dependency compatibility table.
- `docs/ARCHITECTURE.md` covering project state, commands, composition compilation and preview/export parity.
- `docs/FEATURES.md` with every requested feature, platform support, preview/export status and model/provider requirements.
- `docs/SETUP.md` with native prerequisites, permissions, external-service configuration and build troubleshooting.
- `docs/VERIFICATION.md` containing commands actually run, results, device coverage and remaining limitations.
- Appropriate `.env.example` files containing public settings and server-side secret names without real credentials.
- A clear README explaining how to build, test and enable optional services.

If working through chat instead of directly editing files, identify each file's exact relative path and provide its complete content in coherent buildable batches. Never replace the hard implementation with comments such as 'add video editor here'.

Start by verifying dependencies and scaffolding the project, then immediately implement the real import → trim → text → preview → export vertical slice. Continue through the feature milestones while maintaining a buildable project and truthful verification status.

## Primary references to verify during implementation

Use current primary documentation and confirm the APIs against the selected versions:

- React Native native modules: https://reactnative.dev/docs/turbo-native-modules-introduction
- React Native Codegen: https://reactnative.dev/docs/the-new-architecture/using-codegen
- Android Media3 editing: https://developer.android.com/media/implement/editing-app
- Media3 compositions and limitations: https://developer.android.com/media/media3/transformer/composition
- Apple AVFoundation: https://developer.apple.com/documentation/avfoundation/
- Apple video compositing: https://developer.apple.com/documentation/avfoundation/video-effects
- Original FFmpegKit status and successor reference: https://github.com/arthenica/ffmpeg-kit
- CapCut's public mobile feature catalogue for coverage comparison: https://play.google.com/store/apps/details?id=com.lemon.lvoverseas

Use the CapCut catalogue to compare feature groups. Use platform/provider documentation to implement them. Do not infer that an SDK supports a feature merely because CapCut advertises it.
