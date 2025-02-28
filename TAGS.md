# Tags

Guide to tagging the libraries. See https://nx.dev/structure/monorepo-tags for info about tags.

## List of scopes

If possible, use one of the following scopes:

- shared - a shared lib that contains common stuff usable in all other scopes; can only use other shared libs
- admin - a lib that should only be used in admin tools (woodford, report-builder, etc.); can only use admin or shared libs
- crm - a lib that should only be used in tools related to crm (webapp); can only use other crm or shared libs
- houston - a lib that should only be used in houston projects; can use houston, crm or shared libs

## List of types

If possible, use one of the following library types:

- app - an app, can use any type of library
- webview - a webview app, can use any type of library
- pcf - a pcf component app, can use any type of library
- demo - a demo app, can use any type of library
- feature - feature library, can be used only in apps and can use any other type of library
- ui - ui library, can be used only in apps and other ui libraries and can use any other type of library except feature
- api - api library which should only export interfaces, can only use other api libraries
- data - library which should contain disconnected data-related classes and utilities, can only use other data libraries and api and util libs
- service - a service-layer library, providing connection to external systems, can use api, data, service and util libs
- testing - a testing utility library, can be used in any other library and can use api, util and data libraries
- util - a library with helpers and utilities, can be used in any other library and can only use other util libs
- sdk - temporary type which can accomodate ui, data, services, used for resco-sdk library, and can be imported in ui and data libs, allowing to mix data and ui; please don't use if possible

## List of modes

If possible, use one of the following modes:

- strict - a library in strict mode can only import other strict mode libraries; if the library is strict (via tsconfig) but doesn't have the tag, just add it
- loose - a non-strict library can import library in strict mode too, but not vice versa

## Graphic Library Architecture

To preview [Graphic Library Architecture](TAGS.puml), you have to:

- Install the extension [PlantUML Previewer](https://marketplace.visualstudio.com/items?itemName=Mebrahtom.plantumlpreviewer)
- Open a `TAGS.puml` file in Visual Studio Code editor
- Right click on the file and select `Preview current PlantUML code`.
