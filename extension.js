'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

let panelButton, session, sourceId;

function scheduleNextUpdate(interval) {
    if (sourceId) {
        GLib.Source.remove(sourceId);
        sourceId = null;
    }
    sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
        updateRate();
        return GLib.SOURCE_CONTINUE;
    });
}

async function updateRate() {
    try {
        session ??= new Soup.Session({ timeout: 10 });
        const message = Soup.Message.new('GET', 'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=rub');
        const bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        const { usd: { rub } } = JSON.parse(new TextDecoder().decode(bytes.get_data()));
        const rate = parseFloat(rub).toFixed(2).replace('.', ',');
        panelButton.set_child(new St.Label({ style_class: 'cPanelText', text: `USD = ${rate} RUB`, y_align: Clutter.ActorAlign.CENTER }));
        scheduleNextUpdate(300); // Успешное обновление - интервал 5 минут
    } catch (e) {
        console.error(`Error: ${e.message}`);
        panelButton.set_child(new St.Label({ style_class: 'cPanelText', text: '(USD = ? RUB)', y_align: Clutter.ActorAlign.CENTER }));
        scheduleNextUpdate(5); // Ошибка - повтор через 5 секунд
    }
}

export default class Extension {
    enable() {
        panelButton = new St.Bin({ style_class: 'panel-button' });
        Main.panel._centerBox.insert_child_at_index(panelButton, 0);
        updateRate(); // Первоначальный запрос при включении
    }

    disable() {
        Main.panel._centerBox.remove_child(panelButton);
        panelButton?.destroy();
        if (sourceId) {
            GLib.Source.remove(sourceId);
            sourceId = null;
        }
        session?.abort();
        session = null;
    }
}
