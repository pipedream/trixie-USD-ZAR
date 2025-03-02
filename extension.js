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

// Handle Requests API for USD-RUB
async function handle_request_dollar_api() {
    try {
        // Create a new Soup Session
        if (!session) {
            session = new Soup.Session({ timeout: 10 });
        }

        // API URL for USD-RUB (Центральный Банк России)
        const apiUrl = 'https://www.cbr-xml-daily.ru/daily_json.js';

        // Create Soup request
        let message = Soup.Message.new('GET', apiUrl);

        // Send Soup request to API Server
        await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (_, r0) => {
            let text = session.send_and_read_finish(r0);
            let response = new TextDecoder().decode(text.get_data());
            const body_response = JSON.parse(response);

            // Get the value of USD-RUB
            dollarQuotation = body_response["Valute"]["USD"]["Value"];
            dollarQuotation = dollarQuotation.toFixed(2); // Округляем до двух знаков после запятой

            // Set text in Widget
            panelButtonText = new St.Label({
                style_class: "cPanelText",
                text: `(1 USD = ${dollarQuotation} RUB)`,
                y_align: Clutter.ActorAlign.CENTER,
            });
            panelButton.set_child(panelButtonText);

            // Finish Soup Session
            session.abort();
            text = undefined;
            response = undefined;
        });
    } catch (error) {
        console.error(`Traceback Error in [handle_request_dollar_api]: ${error}`);
        panelButtonText = new St.Label({
            text: "USD = N/A RUB",
            y_align: Clutter.ActorAlign.CENTER,
        });
        panelButton.set_child(panelButtonText);
        session.abort();
    }
}

export default class Extension {
    enable() {
        panelButton = new St.Bin({
            style_class: "panel-button",
        });

        // Initial API call
        handle_request_dollar_api();

        // Add the button to the panel
        Main.panel._centerBox.insert_child_at_index(panelButton, 0);

        // Update the rate every 5 minutes (300 seconds)
        sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 300, () => {
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
