// This extension shows USD to RUB conversion on Gnome panel.
// Copyright (C) 2023  arfiesat (modified for USD-RUB)
// See LICENSE file

'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

let panelButton;
let panelButtonText;
let session;
let dollarQuotation;
let sourceId = null;
let previousRate = null; // Для хранения предыдущего значения курса

// Настройки
const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.usd-rub';
let settings;

// Handle Requests API for USD-RUB
async function handle_request_dollar_api() {
    try {
        // Create a new Soup Session
        if (!session) {
            session = new Soup.Session({ timeout: 10 });
        }

        // Получаем API-ключ из настроек
        const apiKey = settings.get_string('api-key');
        if (!apiKey) {
            console.error('API Key is not set');
            return;
        }

        // API URL for USD-RUB (Alpha Vantage)
        const apiUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=RUB&apikey=${apiKey}`;

        // Create Soup request
        let message = Soup.Message.new('GET', apiUrl);

        // Send Soup request to API Server
        await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (_, r0) => {
            let text = session.send_and_read_finish(r0);
            let response = new TextDecoder().decode(text.get_data());
            const body_response = JSON.parse(response);

            // Get the value of USD-RUB
            const currentRate = parseFloat(body_response["Realtime Currency Exchange Rate"]["5. Exchange Rate"]).toFixed(2);

            // Определяем цвет текста для значения курса (x)
            let rateColor = 'white'; // По умолчанию белый
            if (previousRate !== null) {
                if (currentRate > previousRate) {
                    rateColor = 'red'; // Курс рубля упал (USD вырос)
                } else if (currentRate < previousRate) {
                    rateColor = 'green'; // Курс рубля вырос (USD упал)
                }
            }
            previousRate = currentRate; // Сохраняем текущий курс для следующего сравнения

            // Форматируем текст с цветами
            const formattedText = `USD = <span color="${rateColor}">${currentRate}</span> <span color="white">RUB</span>`;

            // Устанавливаем текст в виджет
            if (!panelButtonText) {
                panelButtonText = new St.Label({
                    style_class: "cPanelText",
                    y_align: Clutter.ActorAlign.CENTER,
                });
                panelButton.set_child(panelButtonText);
            }
            panelButtonText.set_markup(formattedText);

            // Finish Soup Session
            session.abort();
            text = undefined;
            response = undefined;
        });
    } catch (error) {
        console.error(`Traceback Error in [handle_request_dollar_api]: ${error}`);
        if (!panelButtonText) {
            panelButtonText = new St.Label({
                style_class: "cPanelText",
                y_align: Clutter.ActorAlign.CENTER,
            });
            panelButton.set_child(panelButtonText);
        }
        panelButtonText.set_text("USD = N/A RUB");
        session.abort();
    }
}

export default class Extension {
    constructor() {
        settings = new Gio.Settings({ schema_id: SETTINGS_SCHEMA });
    }

    enable() {
        panelButton = new St.Bin({
            style_class: "panel-button",
        });

        // Initial API call
        handle_request_dollar_api();

        // Add the button to the panel
        Main.panel._centerBox.insert_child_at_index(panelButton, 0);

        // Update the rate based on the interval from settings
        const updateInterval = settings.get_int('update-interval');
        sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, updateInterval, () => {
            handle_request_dollar_api();
            return GLib.SOURCE_CONTINUE;
        });
    }

    disable() {
        // Remove the button from the panel
        Main.panel._centerBox.remove_child(panelButton);

        // Clean up resources
        if (panelButton) {
            panelButton.destroy();
            panelButton = null;
        }

        if (sourceId) {
            GLib.Source.remove(sourceId);
            sourceId = null;
        }

        if (session) {
            session.abort();
            session = null;
        }
    }
}
