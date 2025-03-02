'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

let panelButton, session, sourceId;

async function updateRate() {
    try {
        if (!session) session = new Soup.Session({ timeout: 10 });
        let message = Soup.Message.new('GET', 'https://www.cbr-xml-daily.ru/daily_json.js');
        let bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        let response = JSON.parse(new TextDecoder().decode(bytes.get_data()));
        let rate = response['Valute']['USD']['Value'].toFixed(2).replace('.', ',');
        panelButton.set_child(new St.Label({
            text: `USD = <span color='white'>${rate} RUB</span>`,
            y_align: Clutter.ActorAlign.CENTER,
            use_markup: true,
        }));
    } catch (e) {
        console.error(`Error: ${e.message}`);
        panelButton.set_child(new St.Label({ text: 'USD = ? RUB', y_align: Clutter.ActorAlign.CENTER }));
    }
}

export default class Extension {
    enable() {
        panelButton = new St.Bin({ style_class: 'panel-button' });
        Main.panel._centerBox.insert_child_at_index(panelButton, 0);
        updateRate();
        sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 86400, () => {
            updateRate();
            return GLib.SOURCE_CONTINUE;
        });
    }

    disable() {
        Main.panel._centerBox.remove_child(panelButton);
        if (panelButton) panelButton.destroy();
        if (sourceId) GLib.Source.remove(sourceId);
        if (session) session.abort();
    }
}
