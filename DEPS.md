# Dependency related info

This doc will describe some of the dependencies that are used in the projects. This can be an info about why the dependency is used, how it should be maintained, if it's a temporary or special solution to something, when the dependency should be removed and stuff like that.

## Recommendations for introduction of new packages

If there is a need for adding a new package, to avoid future problems, we should consider some attributes and conditions when choosing one.

Ideally, the package should

- adhere to https://semver.org,
- have a version above `1.0.0` which means it is stable already (versions below 1.0.0 allow to introduce breaking changes without changing major version),
- be open-sourced,
- have a good amount of recent activity in github,
- have more than one maintainer,
- have types included or `@types` package available,
- be unit tested.

If possible, try to avoid adding new dev/build related packages (e.g. webpack plugins) so that nx upgrades are easy and smooth.

## React-specific overrides

Some of the react packages (e.g. `literallycanvas`) are not maintained properly and require lower react versions in their peerDependencies listing than we use. To avoid package installation errors, we override the expectations of those packages to allow the actual react version that's installed. We assume the packages actually still work with the current react versions, despite the declared requirements, but we should keep an eye on that on every react upgrade.

These deps are used in houston-related stuff that is becoming deprecated, so hopefully we will be able to remove the deps soon.
