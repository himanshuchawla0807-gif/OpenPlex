# Application icons

Light uses the existing OpenPlex mark. Dark is a generated material/lighting variation of that same mark: charcoal-plum walls, a violet-to-rosy-copper gradient and warm doorway light. Both retain real alpha transparency. These assets affect the native application icon only; the web logo and welcome artwork remain unchanged.

The running Dock icon follows the app's Light, Dark or System preference using [NSApplication.applicationIconImage](https://developer.apple.com/documentation/appkit/nsapplication/applicationiconimage). The signed bundle is never rewritten during switching. The bundled ICNS remains the light/default icon used when the app is not running; this implementation does not promise dynamic Finder or Launchpad variants.

Dark artwork was created with the built-in image-generation tool from the existing mark. Final prompt: preserve the isometric O/P courtyard geometry, framing and scale; change only the materials to a smooth charcoal-plum/violet/rosy-copper gradient with pale lavender edges and warm apricot doorway light; transparent background, no blue, text, added objects or backdrop.
