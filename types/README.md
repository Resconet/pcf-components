# Types

This folder contains declaration files for some common global variables which are injected via Define plugin, and also for importable asset modules.

The declaration files can be selectively included by adding them to the `"files"` section of _tsconfig.json_ or _tsconfig.app.json_ (or wherever).

Please pay attention to the hierarchy of the _tsconfig_ files. If there is a `"files"` section in a tsconfig which overrides another tsconfig, you need to put it there, not to the base, since the child will overwrite the base (they won't get merged).

**Note** Please try to keep this folder as small and clean as possible.
