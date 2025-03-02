'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

let panelButton, session, sourceId, previousRate = null;

async function updateRate() {
    try {
        session ??= new Soup.Session({ timeout: 10 });
        const message = Soup.Message.new('GET', 'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=rub');
        const bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        const { usd: { rub } } = JSON.parse(new TextDecoder().decode(bytes.get_data()));
        const rate = parseFloat(rub).toFixed(2).replace('.', ',');

        // Определяем цвет текста в зависимости от изменения курса
        let color = 'white'; // По умолчанию
        if (previousRate !== null) {
            if (rate > previousRate) {
                color = 'green'; // Курс вырос
            } else if (rate < previousRate) {
                color = 'red'; // Курс упал
            }
        }
        previousRate = rate; // Сохраняем текущий курс для следующего сравнения

        // Обновляем текст на панели с цветом
        panelButton.set_child(new St.Label({
            style_class: 'cPanelText',
            text: `USD = <span color="${color}">${rate}</span> RUB`,
            y_align: Clutter.ActorAlign.CENTER,
            use_markup: true, // Разрешаем использование HTML-разметки
        }));
    } catch (e) {
        console.error(`Error: ${e.message}`);
        panelButton.set_child(new St.Label({
            style_class: 'cPanelText',
            text: '(USD = ? RUB)',
            y_align: Clutter.ActorAlign.CENTER,
        }));
    }
}

export default class Extension {
    enable() {
        panelButton = new St.Bin({ style_class: 'panel-button' });
        Main.panel._centerBox.insert_child_at_index(panelButton, 0);
        updateRate();
        sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 300, () => (updateRate(), GLib.SOURCE_CONTINUE));
    }

    disable() {
        Main.panel._centerBox.remove_child(panelButton);
        panelButton?.destroy();
        GLib.Source.remove(sourceId);
        session?.abort();
    }
}
