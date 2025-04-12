'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class CurrencyExtension {
    constructor() {
        // Инициализация свойств класса
        this._panelButton = null;
        this._session = null;
        this._timeoutId = null;
    }

    _scheduleNextUpdate(interval) {
        // Удаляем предыдущий таймер, если он существует
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        // Устанавливаем новый таймер
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
            this._updateRate();
            return GLib.SOURCE_CONTINUE;
        });
    }

    async _updateRate() {
        try {
            // Инициализация сессии, если она ещё не создана
            this._session ??= new Soup.Session({ timeout: 10 });

            // Создаем запрос к API
            const message = Soup.Message.new('GET', 'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=zar');
            const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);

            // Парсим ответ и обновляем текст
            const { usd: { zar } } = JSON.parse(new TextDecoder().decode(bytes.get_data()));
            const rate = parseFloat(zar).toFixed(2).replace('.', ',');
            this._panelButton.set_child(new St.Label({
                style_class: 'cPanelText',
                text: `USD = ${rate} ZAR`,
                y_align: Clutter.ActorAlign.CENTER
            }));

            // Успешное обновление - интервал 5 минут
            this._scheduleNextUpdate(300);
        } catch (e) {
            console.error(`Error: ${e.message}`);

            // Ошибка - показываем "?" и повторяем через 7 секунд
            this._panelButton.set_child(new St.Label({
                style_class: 'cPanelText',
                text: 'soon',
                y_align: Clutter.ActorAlign.CENTER
            }));
            this._scheduleNextUpdate(7);
        }
    }

    enable() {
        // Создаем кнопку на панели
        this._panelButton = new St.Bin({ style_class: 'panel-button' });
        Main.panel._centerBox.insert_child_at_index(this._panelButton, 0);

        // Первоначальный запрос при включении
        this._updateRate();
    }

    disable() {
        // Удаляем кнопку с панели
        if (this._panelButton) {
            Main.panel._centerBox.remove_child(this._panelButton);
            this._panelButton.destroy();
            this._panelButton = null;
        }

        // Останавливаем таймер
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        // Закрываем сессию
        if (this._session) {
            this._session.abort();
            this._session = null;
        }
    }
}
