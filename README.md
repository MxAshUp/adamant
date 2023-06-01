# Adamant

## About

Adamant is a comprehensive framework designed to provide a modular backbone for server applications. It simplifies the integration of Express, MongoDB, Socket.io, and a custom plugin system. The framework is tailored to support data collection as event drivers and is maintained with this specific purpose in mind.

## Core Features

Adamant offers a range of functionalities and components:

### App

The App class is at the core of Adamant. During construction, it sets up event dispatching, initializes a web server, and loads a default 'adamant' plugin. Moreover, it creates hooks for the loading of various component types.

### Methods

Adamant comprises a multitude of methods such as initializing the database, web routes, and socket connections, loading plugins and components, managing the loading of different types of components into the app, and responding to various types of events or errors.

### Event-Driven Architecture

The framework emphasizes modularity and extensibility. Different plugins, components, and application segments can coordinate and communicate through events emitted at various points, enabling robust and flexible interactions within the system.

## Extendable Classes

Adamant features a set of classes intended for extension, facilitating the creation of components that are included in plugins.

### Plugin

The Plugin class lays the foundation for creating plugins. Each plugin can possess properties like name, version, author, and various functionality methods. These methods include load_routes, map_events, extend_schema, create_component, and load_models.

Detailed below are the Plugin class's primary responsibilities:

- **Constructor**: This method takes an object as an argument with multiple properties. If some properties are not provided, default values are assigned.

- **Extend_Schema**: This method modifies a model's schema, used in conjunction with Mongoose.

- **Create_Component**: This method facilitates the creation of a component based on certain properties. If the plugin's version requirement isn't met, an error is thrown.

- **Load_Models**: This method loads models in mongoose, allowing for a schema callback to provide plugin options or middleware.

- **Load_Routes, Map_Events, On_Load, On_Unload**: These methods can be overridden with specific functionalities during plugin instantiation.

### Collector

The Collector class, an extension of the base Component class, sets the blueprint for interaction with a MongoDB database through Mongoose and outlines the methods for specific types of data collection, handling, and management operations.

The primary properties and methods that `Collector` sets up for inheritance include:

- **Properties**: These include `model_name`, `identifier`, `initialize_flag`, `run_results`, `run_report_count`, and `run_report`.

- **Methods**: These include `initialize()`, `prepare()`, `collect(prepared_data)`, `garbage(prepared_data)`, `run()`, `_do_collect()`, `_insert_data(data_row)`, `_handle_collect_error(err)`, `_remove_data(lookup)`.

In addition, the Collector class provides placeholder structures for utility functions and outlines error handling capabilities with specific error types.

### EventHandler

The EventHandler class extends the base Component class and provides mechanisms for handling specific events within the application.

The key properties and methods provided by the EventHandler class include:

- **Properties**: These include `event_name`, `should_handle`, `defer_dispatch`, `enqueue_complete_event`, and `transform_function`.

- **Methods**: This class primarily includes the `dispatch(data)` method which is designed to be overridden by subclasses for specific event handling.

### Workflow

The Workflow class extends the EventHandler class and provides mechanisms for chaining together a series of EventHandlers.

The primary properties and methods provided by the Workflow class include:

- **Constructor**: The constructor creates an instance of Workflow with an array `event_handler_sequence` with the Workflow instance as the initial element.

- **step**: This method allows a step to be registered in the workflow. It takes an EventHandler object as an argument and alters the `event_name` of the handler to fit into the workflow sequence. The transform function of the previous step handler is also updated to include a transition dispatch, which triggers an event for the next step.