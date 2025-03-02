'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

let panelButton, session, sourceId, panelButtonText;

async function updateRate() {
    try {
        if (!session) session = new Soup.Session({ timeout: 10 });

        // Используем CoinGecko API для получения курса USD/RUB
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=rub';
        let message = Soup.Message.new('GET', url);

        let bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        let response = JSON.parse(new TextDecoder().decode(bytes.get_data()));
        console.log("API Response:", response); // Логируем ответ API

        if (!response || !response.usd || !response.usd.rub) {
            throw new Error('Invalid API response: Missing RUB data');
        }

        let rate = parseFloat(response.usd.rub).toFixed(2).replace('.', ',');
        console.log("Current USD Rate:", rate); // Логируем текущий курс

        // Обновляем текст на панели (в соответствии с вашим примером)
        if (panelButton.get_child()) {
            panelButton.get_child().destroy(); // Удаляем старый текст
        }
        panelButtonText = new St.Label({
            style_class: "cPanelText",
            text: "(USD = " + rate + " RUB)",
            y_align: Clutter.ActorAlign.CENTER,
        });
        panelButton.set_child(panelButtonText);

    } catch (e) {
        console.error(`Error: ${e.message}`);
        if (panelButton.get_child()) {
            panelButton.get_child().destroy(); // Удаляем старый текст
        }
        panelButtonText = new St.Label({
            style_class: "cPanelText",
            text: "(1 USD = ? RUB)",
            y_align: Clutter.ActorAlign.CENTER,
        });
        panelButton.set_child(panelButtonText);
    }
}

export default class Extension {
    enable() {
        panelButton = new St.Bin({ style_class: 'panel-button' });

        // Вставляем элемент в левую часть панели
        Main.panel._leftBox.insert_child_at_index(panelButton, 0);

        // Первоначальный запрос курса
        updateRate();

        // Обновляем курс каждые 24 часа (86400 секунд)
        sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 86400, () => {
            updateRate();
            return GLib.SOURCE_CONTINUE;
        });
    }

    disable() {
        Main.panel._leftBox.remove_child(panelButton);
        if (panelButton) panelButton.destroy();
        if (sourceId) GLib.Source.remove(sourceId);
        if (session) session.abort();
    }
}
