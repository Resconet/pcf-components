# Pcf Plugin

This library is a plugin for [Nx](https://nx.dev) and is used for [Plugin Component Framework (PCF)](https://docs.microsoft.com/en-us/powerapps/developer/component-framework/overview) development.

## How PCF apps building work

There are two places where PCF component building and packaging are handled.

1. The Pcf nx plugin handles the generation of PCF applications and also includes an executor for packaging. The generated application is a nx react application with additional configurations for special assets and extra targets such as _package_ or _proxy_. The _package_ target runs the application's _build_ target, adds the built files to a solution zip, and includes additional files like the manifest and control types xml.

2. The [tools/pcf](../../tools/pcf) folder contains tools and plugins for building the PCF application. Specifically, it includes the `withPcf` configurator function and the `PcfPlugin` webpack plugin. The PCF application is built as a normal react web application with the addition of generating the _ControlManifest.xml_. This is achieved through the [PcfPlugin](../../tools/pcf/webpack.pcf.plugin.js). To generate the manifest, various resources are utilized: the app's `project.json` to determine the control type (virtual/standard) and features, the `main` file to extract the `name` and `namespace`, and the `inputsOutputs` file to retrieve the properties.

## Configuring the generated component

To configure the generated component, you can use the following options. This affects how `ControlManifest.xml` file is generated at the build phase.

### Name and Namespace

These can be configured using the `@name` and `@namespace` decorators in the main file.

### Label and Description (Localization)

By default, english localization file is generated for the component with values describing component and all its properties.

The label (display name) of the component is by default inferred from the component name by adding spaces between the words, e.g. `MyComponent` -> `My Component`. Custom label can be set using the `@label` decorator in the main file.

The description is taken from the JSDoc comment of the component class. If there is none, description is set to the same value as label.

### Properties

The properties of the component can be configured in the `inputsOutputs` file. The `inputsOutputs` file contains `Inputs` and `Outputs` interfaces. Properties from the interfaces will be added to the manifest. Attributes of the properties are controlled via JSDoc @tags.

- The `@oftype` tag specifies the type of the property (generated as `of-type` attribute).
- The `@required` tag specifies if the property is required.
- The `@usage` tag specifies the usage (one of "input", "output", "bound").
  - If the `@usage` tag is omitted, the usage is calculated based on the presence of the property in the Inputs and Outputs interfaces.
  - If the property is only in the Inputs interface, its usage is set to "input".
  - If the property is only in the Outputs interface, its usage is set to "output".
  - If the property is present in both interfaces, its usage is set to "bound".
- The `@label` tag specifies the english localization label (display name) of the property. If omitted, the label is inferred from the property name.

- The JSDoc comment of the property determines its english localization description. If omitted, it is set to the label value.

- A DataSet property can be specified using `@oftype DataSet`.

- A typed DataSet property can be specified using `@oftype DataSet<SomeType>`. The `SomeType` has to be declared as another interface in the file, with dataset properties in the same format as all other properties.

### Features

To generate features in the manifest, you can use the `requiredFeatures` and `optionalFeatures` options in the build target configuration.

- The `requiredFeatures` option specifies the features that are required for the component.
- The `optionalFeatures` option specifies the features that are optional for the component.

These options will generate the corresponding use-feature tags in the manifest file.

## Troubleshooting

### I've created a package and imported it, but it doesn't show up in the "Get more components" dialog in PCF app

1. Make sure at least one input field is bound (`@usage bound`).
2. Make sure you click Publish all customizations.
3. Reload the App page, just clicking Refresh is not enough.
