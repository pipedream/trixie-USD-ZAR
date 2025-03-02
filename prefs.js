// prefs.js

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.usd-rub';

function init() {
    // Ничего не делаем
}

function buildPrefsWidget() {
    const settings = new Gio.Settings({ schema_id: SETTINGS_SCHEMA });

    const prefsWidget = new Gtk.Grid({
        margin: 20,
        row_spacing: 12,
        column_spacing: 12,
        column_homogeneous: false,
        row_homogeneous: false,
    });

    // API Key
    const apiKeyLabel = new Gtk.Label({
        label: 'API Key:',
        halign: Gtk.Align.START,
    });
    const apiKeyEntry = new Gtk.Entry({
        text: settings.get_string('api-key'),
        hexpand: true,
    });
    apiKeyEntry.connect('changed', (entry) => {
        settings.set_string('api-key', entry.get_text());
    });

    // Update Interval
    const intervalLabel = new Gtk.Label({
        label: 'Update Interval (seconds):',
        halign: Gtk.Align.START,
    });
    const intervalSpinButton = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 86400,
            step_increment: 1,
            page_increment: 10,
        }),
        value: settings.get_int('update-interval'),
    });
    intervalSpinButton.connect('value-changed', (spinButton) => {
        settings.set_int('update-interval', spinButton.get_value_as_int());
    });

    // Добавляем элементы в сетку
    prefsWidget.attach(apiKeyLabel, 0, 0, 1, 1);
    prefsWidget.attach(apiKeyEntry, 1, 0, 1, 1);
    prefsWidget.attach(intervalLabel, 0, 1, 1, 1);
    prefsWidget.attach(intervalSpinButton, 1, 1, 1, 1);

    prefsWidget.show_all();
    return prefsWidget;
}

export default { init, buildPrefsWidget };
