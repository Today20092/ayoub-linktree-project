# Separate watched-folder discovery from uploads

Watched-folder sessions use an explicitly started, visible foreground service for continuous discovery, with a declared `specialUse` subtype and a bounded, renewable wake lock. New arrivals use separate network-constrained jobs because Android restricts scheduling user-initiated transfer jobs from the background; manual batches retain their existing user-initiated jobs. This preserves discovery while uploads are paused or offline, at the cost of battery use during watching and Android-controlled transfer timing; a saved session requires explicit resume after a restart.

See [Android foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types#special-use), [user-initiated transfer restrictions](https://developer.android.com/develop/background-work/background-tasks/uidt), and the [agreed behavior](../android-watched-folder-design.md).
