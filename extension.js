'use strict';

import St from 'gi://St';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

let panel, session, tUpdate, tRetry;

const updateText = (text) => panel.set_child(new St.Label({
    style_class: 'cPanelText',
    text: `USD = ${text} RUB`,
    y_align: Clutter.ActorAlign.CENTER
}));

async function updateRate() {
    try {
        session ??= new Soup.Session({ timeout: 5 });
        const msg = Soup.Message.new('GET', 'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=rub');
        const data = JSON.parse(new TextDecoder().decode((await session.send_and_read_async(msg, 0, null)).get_data()));
        
        if (!data?.usd?.rub) throw new Error('Invalid API response');
        updateText(parseFloat(data.usd.rub).toFixed(2).replace('.', ','));
        
        tRetry = GLib.source_remove(tRetry);
        if (!tUpdate) tUpdate = GLib.timeout_add_seconds(0, 300, updateRate);
    } catch(e) {
        console.error(e);
        updateText('?');
        if (!tRetry) tRetry = GLib.timeout_add_seconds(0, 5, () => (updateRate(), tRetry = null));
    }
}

export default class {
    enable() {
        panel = new St.Bin({ style_class: 'panel-button' });
        Main.panel._centerBox.insert_child_at_index(panel, 0);
        updateRate();
        tUpdate = GLib.timeout_add_seconds(0, 300, updateRate);
    }
    
    disable() {
        Main.panel._centerBox.remove_child(panel);
        [tUpdate, tRetry].forEach(t => t && GLib.source_remove(t));
        panel?.destroy();
        session?.abort();
    }
}
