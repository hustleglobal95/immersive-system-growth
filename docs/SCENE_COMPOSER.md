# Scene Composer

Forge scenes are composed in `config/experience.json`. A scene defines six synchronized layers:

1. normalized scroll range
2. camera from/to state and path preset
3. persistent hero from/to transform
4. world atmosphere and lighting
5. postprocessing values
6. accessible DOM copy

Create a draft with:

```bash
npm run scene:new -- kitchen-pass
```

Then copy the generated scene into the main config and rebalance all scene ranges. Run `npm run experience:validate` after every timeline edit.

## Range planning

Do not allocate equal duration automatically. A threshold may need only 8 percent of the timeline while a room exploration may need 22 percent. Duration should match visual work and reading time.
