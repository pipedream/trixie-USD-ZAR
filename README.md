Download via Gnome Extension Store: -

or

cd /tmp && \
git clone https://github.com/Makev1ch/USD-RUB.git && \
mv USD-RUB usd-rub@makev1ch.github.com && \
cp -av usd-rub@makev1ch.github.com ~/.local/share/gnome-shell/extensions/ && \
gnome-extensions enable usd-rub@makev1ch.github.com && \
rm -rf usd-rub@makev1ch.github.com



Last method is deprecated with the newer versions, just copy extension file to
```
~/.local/share/gnome-shell/extensions/
```
then restart GNOME Shell and run

To restart GNOME Shell in X11, pressing Alt+F2 to open the Run Dialog and enter restart 
(or just r). 
In Wayland Logout and Login again.
