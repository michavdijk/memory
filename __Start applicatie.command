#!/bin/bash
# Navigeer naar de map van de app
cd "$(dirname "$0")"

# Open de browser na een korte pauze (zodat de server tijd heeft om te starten)
sleep 0.5 && open "http://localhost:8123" &

echo "======================================"
echo "  Memory wordt gestart..."
echo "  Open: http://localhost:8123"
echo "  Sluit dit venster om te stoppen."
echo "======================================"

# Start de webserver
python3 -m http.server 8123
