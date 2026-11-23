# jQuery Update Drupal Module

jQuery Update module upgrades Drupal's stable version of jQuery in order to
support the most current jQuery version available.

Once a stable release of Drupal comes out, only minor bug-fix changes may be
added to it, so Drupal's version of jQuery will often lag behind the most recent
release offered by the jQuery project. The jQuery community tends to only
support the most recent version, so this module ensures that your Drupal
installation can run the most up-to-date jQuery plug-ins.


## Installation
1. **Copy the module directory:**
   - Place the `tag1d7es_jquery_update` directory in one of the following locations:
     - `sites/all/modules`
     - `sites/SITENAME/modules` (for multi-site setups)

2. **Delete existing jQuery Update module:**
   - Delete `jquery_update` module directory if it already exists. This module ships with
     an empty `jquery_update` module as a workaround to maintain compatibility with other
     modules that depend on it. You may need to clear all caches to ensure everything functions correctly.

3. **Enable the module:**
   - Navigate to **Administer > Modules** (`/admin/modules`), locate **Tag1 D7ES jQuery Update**, and enable it.
   - Or, use Drush:
     ```bash
     drush en tag1d7es_jquery_update
     ```

4. **Configure the module:**
   - Go to **Administer > Configuration > Development > jQuery Update** (`/admin/config/development/tag1d7es_jquery_update`).
   - Select the desired jQuery version (e.g., 3.7.1) from the available options.
   - Save the configuration.

5. **Use the latest jQuery:**
   - To use **jQuery 3.7.1** as a drop-in replacement, ensure the following:
     - **jQuery UI 1.14.0** is enabled. Newer version of jQuery UI is needed to support jQuery 3.7.1.
     - The **jQuery Migrate** module is enabled to handle deprecated jQuery APIs.
   - With these configurations, jQuery 3.7.1 and jQuery UI can seamlessly replace the default versions in your Drupal 7 site.

6. **Lastly, if not already completed in step 2, remove (do not disable or uninstall) the legacy `jQuery Update` module code.
   Flush Drupal cache to register its relocation to the empty version bundled with this module.**

## Key Differences in jQuery UI Components for jQuery UI 1.12+
When migrating from older jQuery UI versions to 1.12+, the main challenge is adjusting the options that now expect objects instead of simple values. By updating these options to the object format, you can ensure your code works with the newer jQuery UI versions while maintaining backward compatibility.

### 1. **Dialog**
- **Position Option:**
  - **Older Versions:**
    `position: 'center'` (string)
  - **1.12+ Versions:**
    `position: { my: 'center', at: 'center', of: window }` (object format)

- **Classes Option:**
  - **Older Versions:**
    `dialogClass: 'className'` (string)
  - **1.12+ Versions:**
    `classes: { 'ui-dialog': 'className' }` (object format)

### 2. **Tooltip**
- **Position Option:**
  - **Older Versions:**
    `position: 'center'` (string)
  - **1.12+ Versions:**
    `position: { my: 'left top', at: 'left bottom', of: window }` (object format with `of`)

- **Class Option:**
  - **Older Versions:**
    `tooltipClass: 'className'` (string)
  - **1.12+ Versions:**
    `classes: { 'ui-tooltip': 'className' }` (object format)

## Patches to update popular modules for latest versions:
- https://www.drupal.org/project/views/issues/3478813

## Maintainer
Tag1 is supporting the jQuery Update module as part of it’s Drupal 7 Extended Support Service which allows D7 sites to continue to run securely after EOL in January 2025. This update allows all D7 users to run jQuery v4 enhancing security. You can learn more about the Tag1 D7ES service, and how you can continue to run D7 after EOL at [D7ES.Tag1.com](https://d7es.tag1.com/).
