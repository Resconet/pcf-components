# Notes and ToDos about nx migrations

Here, notes about specific config (or non-config) changes related to migrations will be written, and TODOs about what should be watched and done later or in future migrations.

## 15.9.4

### Image processing

Because of this https://github.com/nrwl/nx/issues/18095 we need to modify css processing rules.
We will remove postcss plugins from the non-module css processing, and set css-loader to process url again.
That will take advantage of webpack asset processing.

## 15.3.0

### Cannot use 'import.meta'

After migrations, `Cannot use 'import.meta' outside a module` errors began to appear in apps.
As a workaround, this has been added to all `webpack.config.js` files:

```js
		output: {
			...config.output,
			scriptType: "text/javascript",
		},
```

Probably related to https://github.com/nrwl/nx/issues/13628.

**TODO** watch the issue and try to remove the added stuff from webpack configs after it's solved.

## Previous

### License plugin error on windows (scandir)

Because of error being thrown by license plugin at windows, we omit the license plugin in win environments.
It seems to be only needed when HtmlWebpackPlugin is used.

Could be related to https://github.com/xz64/license-webpack-plugin/issues/111.

**TODO** watch the issue and try to remove the use of [license-plugin-fix.js](tools/common/license-plugin-fix.js) after it's solved.
