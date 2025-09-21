const mice = [
  { brand: "Razer", model: "Viper", length: 126.7, width: 66.2, height: 37.8, weight: 69, shape: "Symmetrical (Ambidextrous)", hump: "Low", price: null }, // :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
  { brand: "Razer", model: "Viper Ultimate", length: 126.7, width: 66.2, height: 37.8, weight: 74, shape: "Symmetrical (Ambidextrous)", hump: "Low", price: null }, // :contentReference[oaicite:2]{index=2}
  { brand: "Razer", model: "Viper V2 Pro", length: 125.0, width: 63.5, height: 43.5, weight: 60, shape: "Symmetrical", hump: "High", price: null }, // :contentReference[oaicite:3]{index=3}:contentReference[oaicite:4]{index=4}
  { brand: "Razer", model: "Viper Mini", length: 118.3, width: 53.5, height: 38.3, weight: 61, shape: "Symmetrical", hump: "Low", price: null }, // :contentReference[oaicite:5]{index=5}:contentReference[oaicite:6]{index=6}
  { brand: "Razer", model: "Viper Mini Signature Edition", length: 118.3, width: 53.5, height: 38.3, weight: 49, shape: "Symmetrical", hump: "Low", price: null }, // :contentReference[oaicite:7]{index=7}:contentReference[oaicite:8]{index=8}
  { brand: "Razer", model: "DeathAdder V2", length: 127.0, width: 70.0, height: 42.7, weight: 82, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:9]{index=9}:contentReference[oaicite:10]{index=10}
  { brand: "Razer", model: "DeathAdder V3 Pro", length: 128.0, width: 68.0, height: 44.0, weight: 63, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:11]{index=11}:contentReference[oaicite:12]{index=12}
  { brand: "Razer", model: "DeathAdder V4 Pro", length: 128.0, width: 68.0, height: 44.0, weight: 56, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:13]{index=13}
  { brand: "Razer", model: "Orochi V2", length: 108.0, width: 60.0, height: 38.0, weight: 60, shape: "Symmetrical", hump: "Low", price: null }, // :contentReference[oaicite:14]{index=14}:contentReference[oaicite:15]{index=15}
  { brand: "Razer", model: "Basilisk V3 Pro", length: 130.0, width: 75.4, height: 42.5, weight: 112, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:16]{index=16}

  // Logitech
  { brand: "Logitech", model: "G Pro Wireless", length: 125.0, width: 63.5, height: 40.0, weight: 80, shape: "Symmetrical (Ambidextrous)", hump: "Medium", price: null }, // :contentReference[oaicite:17]{index=17}:contentReference[oaicite:18]{index=18}
  { brand: "Logitech", model: "G Pro X Superlight", length: 125.0, width: 63.5, height: 40.0, weight: 63, shape: "Symmetrical", hump: "Medium", price: null }, // :contentReference[oaicite:19]{index=19}
  { brand: "Logitech", model: "G Pro X Superlight 2", length: 125.0, width: 63.5, height: 43.5, weight: 60, shape: "Symmetrical", hump: "High", price: null }, // :contentReference[oaicite:20]{index=20}
  { brand: "Logitech", model: "G Pro X Superlight 2 DEX", length: 125.8, width: 67.7, height: 43.9, weight: 60, shape: "Symmetrical", hump: "High", price: null }, // :contentReference[oaicite:21]{index=21}
  { brand: "Logitech", model: "G303 Shroud Edition", length: 117.0, width: 70.0, height: 40.0, weight: 75, shape: "Symmetrical (Right-hand use)", hump: "High", price: null }, // :contentReference[oaicite:22]{index=22}
  { brand: "Logitech", model: "G502 Lightspeed", length: 132.0, width: 75.0, height: 40.0, weight: 114, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:23]{index=23}
  
  // G-Wolves
  { brand: "G-Wolves", model: "Hati S", length: 117.0, width: 61.0, height: 40.0, weight: 49, shape: "Symmetrical", hump: "Medium", price: null }, // :contentReference[oaicite:29]{index=29}
  { brand: "G-Wolves", model: "Skoll", length: 125.0, width: 68.0, height: 42.0, weight: 66, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:30]{index=30}:contentReference[oaicite:31]{index=31}
  { brand: "G-Wolves", model: "Skoll Mini", length: 117.0, width: 64.0, height: 40.0, weight: 50, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:32]{index=32}
  { brand: "G-Wolves", model: "Hati M ACE Wireless", length: 124.0, width: 64.0, height: 39.5, weight: 63, shape: "Symmetrical (Right-hand)", hump: "Medium", price: null },
  { brand: "G-Wolves", model: "Hati S ACE Wireless", length: 119.0, width: 63.5, height: 36.0, weight: 56, shape: "Symmetrical (Right-hand)", hump: "Low", price: null },

  // Finalmouse
  { brand: "Finalmouse", model: "Ultralight Air58", length: 128.0, width: 60.0, height: 40.0, weight: 58, shape: "Symmetrical (Right-hand use)", hump: "Medium", price: null }, // :contentReference[oaicite:33]{index=33}
  { brand: "Finalmouse", model: "Ultralight 2 Cape Town", length: 116.0, width: 53.0, height: 36.0, weight: 48, shape: "Symmetrical (Right-hand use)", hump: "Low", price: null }, // :contentReference[oaicite:34]{index=34}:contentReference[oaicite:35]{index=35}
  { brand: "Finalmouse", model: "Starlight-12 Small", length: 115.0, width: 60.0, height: 36.0, weight: 42, shape: "Symmetrical (Right-hand use)", hump: "Low", price: null }, // :contentReference[oaicite:36]{index=36}:contentReference[oaicite:37]{index=37}
  { brand: "Finalmouse", model: "Starlight-12 Medium", length: 128.0, width: 62.0, height: 37.0, weight: 47, shape: "Symmetrical (Right-hand use)", hump: "Medium", price: null }, // :contentReference[oaicite:38]{index=38}:contentReference[oaicite:39]{index=39}

  // SteelSeries
  { brand: "SteelSeries", model: "Sensei Ten", length: 126.0, width: 68.0, height: 39.0, weight: 92, shape: "Symmetrical (Ambidextrous)", hump: "Medium", price: null }, // :contentReference[oaicite:40]{index=40}:contentReference[oaicite:41]{index=41}
  { brand: "SteelSeries", model: "Rival 310", length: 128.0, width: 70.0, height: 42.0, weight: 88, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:42]{index=42}
  { brand: "SteelSeries", model: "Rival 600", length: 131.0, width: 69.0, height: 44.0, weight: 96, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:43]{index=43}:contentReference[oaicite:44]{index=44}
  { brand: "SteelSeries", model: "Prime Wireless", length: 125.3, width: 67.9, height: 42.4, weight: 80, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:45]{index=45}
  { brand: "SteelSeries", model: "Aerox 3 Wireless", length: 120.0, width: 67.0, height: 38.0, weight: 68, shape: "Symmetrical (Right-hand use)", hump: "Low", price: null }, // :contentReference[oaicite:46]{index=46}

  // Xtrfy
  { brand: "Xtrfy", model: "M4", length: 120.0, width: 68.0, height: 39.0, weight: 69, shape: "Ergonomic (Right-hand)", hump: "Medium", price: null }, // :contentReference[oaicite:47]{index=47}
  { brand: "Xtrfy", model: "MZ1", length: 111.0, width: 58.5, height: 36.5, weight: 56, shape: "Symmetrical", hump: "Low", price: null }, // :contentReference[oaicite:48]{index=48}
  { brand: "Xtrfy", model: "M8 Wireless", length: 118.0, width: 60.5, height: 38.5, weight: 55, shape: "Symmetrical", hump: "Low", price: null }, // :contentReference[oaicite:49]{index=49}

  // Ninjutso
  { brand: "Ninjutso", model: "Origin One X", length: 121.4, width: 58.0, height: 39.9, weight: 65, shape: "Ergonomic (Right-hand)", hump: "High", price: null }, // :contentReference[oaicite:50]{index=50}
  { brand: "Ninjutso", model: "Katana Superlight", length: 125.0, width: 60.0, height: 39.2, weight: 60, shape: "Symmetrical (Right-hand use)", hump: "Medium", price: null }, // :contentReference[oaicite:51]{index=51}
  { brand: "Ninjutso", model: "Sora V2", length: 119.2, width: 59.0, height: 37.3, weight: 40, shape: "Symmetrical (Right-hand)", hump: "Low", price: null },

  // Pulsar
  { brand: "Pulsar", model: "Xlite v4", length: 122.0, width: 66.0, height: 43.0, weight: 54, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Pulsar", model: "Xlite v4 Mini", length: 115.6, width: 63.4, height: 40.7, weight: 52, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Pulsar", model: "Xlite v4 Large", length: 126.6, width: 69.5, height: 44.5, weight: 58, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Pulsar", model: "Xlite v3 eS", length: 122.0, width: 66.0, height: 43.0, weight: 65, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Pulsar", model: "Xlite Wired", length: 122.0, width: 66.0, height: 43.0, weight: 52, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Pulsar", model: "X2 v3", length: 120.4, width: 63.0, height: 38.0, weight: 52, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Pulsar", model: "X2 v3 Mini", length: 115.6, width: 61.0, height: 37.0, weight: 51, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Pulsar", model: "X2 v2", length: 120.0, width: 63.0, height: 38.0, weight: 56, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Pulsar", model: "X2 v1", length: 120.0, width: 63.0, height: 38.0, weight: 60, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Pulsar", model: "X2 Wired", length: 120.0, width: 63.0, height: 38.0, weight: 56, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Pulsar", model: "X2A v3", length: 120.4, width: 63.0, height: 38.0, weight: 56, shape: "Symmetrical (Ambidextrous)", hump: "Low", price: null },
  { brand: "Pulsar", model: "X2A Wired", length: 120.4, width: 63.0, height: 38.0, weight: 55, shape: "Symmetrical (Ambidextrous)", hump: "Low", price: null },
  { brand: "Pulsar", model: "X2H v3", length: 120.4, width: 65.0, height: 39.1, weight: 53, shape: "Symmetrical", hump: "High", price: null },
  { brand: "Pulsar", model: "X2H v3 Mini", length: 115.6, width: 62.0, height: 38.0, weight: 51, shape: "Symmetrical", hump: "High", price: null },
  { brand: "Pulsar", model: "X2H Wired", length: 120.4, width: 65.0, height: 39.1, weight: 51, shape: "Symmetrical", hump: "High", price: null },
  { brand: "Pulsar", model: "X2 CrazyLight", length: 115.6, width: 61.0, height: 36.6, weight: 35, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Pulsar", model: "X3", length: 124.7, width: 69.5, height: 43.1, weight: 55, shape: "Hybrid Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Pulsar", model: "X3 Mini", length: 119.6, width: 67.1, height: 41.0, weight: 50, shape: "Hybrid Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Pulsar", model: "X3 LHD", length: 124.7, width: 69.5, height: 43.1, weight: 55, shape: "Hybrid Ergonomic (Left-hand)", hump: "Center", price: null },
  { brand: "Pulsar", model: "Feinmann F01", length: 118.6, width: 65.3, height: 41.7, weight: 46, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "Pulsar", model: "JV-X", length: 121.0, width: 62.0, height: 41.0, weight: 56, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "Pulsar", model: "ZywOo The Chosen Mouse", length: 119.4, width: 67.5, height: 43.5, weight: 59, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "Pulsar", model: "TenZ Signature Edition", length: 120.0, width: 64.0, height: 40.5, weight: 47, shape: "Symmetrical", hump: "Low", price: null },

  // Endgame Gear
  { brand: "Endgame Gear", model: "XM1", length: 122.0, width: 66.0, height: 38.0, weight: 70, shape: "Symmetrical (Right-hand use)", hump: "Low", price: null },
  { brand: "Endgame Gear", model: "XM1r", length: 122.0, width: 66.0, height: 38.0, weight: 70, shape: "Symmetrical (Right-hand use)", hump: "Low", price: null },
  { brand: "Endgame Gear", model: "XM1 RGB", length: 122.0, width: 66.0, height: 38.0, weight: 82, shape: "Symmetrical (Right-hand use)", hump: "Low", price: null },
  { brand: "Endgame Gear", model: "XM2 8k v2", length: 122.0, width: 66.0, height: 38.0, weight: 52, shape: "Symmetrical (Right-hand use)", hump: "Low", price: null },
  { brand: "Endgame Gear", model: "XM2w 4k v2", length: 122.0, width: 66.0, height: 38.0, weight: 63, shape: "Symmetrical (Right-hand use)", hump: "Low", price: null },
  { brand: "Endgame Gear", model: "XM2we", length: 122.0, width: 66.0, height: 38.0, weight: 63, shape: "Symmetrical (Right-hand use)", hump: "Low", price: null },
  { brand: "Endgame Gear", model: "OP1", length: 118.2, width: 60.5, height: 37.2, weight: 50.5, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Endgame Gear", model: "OP1 RGB", length: 118.2, width: 60.5, height: 37.2, weight: 60, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Endgame Gear", model: "OP1we", length: 118.2, width: 60.5, height: 37.2, weight: 58.5, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Endgame Gear", model: "OP1w 4k v2", length: 118.2, width: 60.5, height: 37.2, weight: 58.5, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "Endgame Gear", model: "OP1 8k v2", length: 118.2, width: 60.5, height: 37.2, weight: 50.5, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },

  // VAXEE
  { brand: "VAXEE", model: "XE Wireless", length: 124.0, width: 66.0, height: 38.7, weight: 73, shape: "Symmetrical (Ambidextrous)", hump: "Low", price: null },
  { brand: "VAXEE", model: "XE-S Wireless", length: 118.0, width: 64.0, height: 36.0, weight: 60, shape: "Symmetrical (Ambidextrous)", hump: "Low", price: null },
  { brand: "VAXEE", model: "XE-S L (Left-Hand) Wireless", length: 118.0, width: 64.0, height: 36.0, weight: 60, shape: "Symmetrical (Left-hand)", hump: "Low", price: null },
  { brand: "VAXEE", model: "Zygen NP-01", length: 120.0, width: 66.0, height: 39.0, weight: 75, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "VAXEE", model: "Zygen NP-01S", length: 120.0, width: 63.0, height: 37.0, weight: 71, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "VAXEE", model: "Zygen NP-01 Wireless (4K)", length: 118.0, width: 66.0, height: 39.0, weight: 72, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "VAXEE", model: "Zygen NP-01S Wireless (4K)", length: 120.0, width: 63.0, height: 37.0, weight: 69, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "VAXEE", model: "Zygen NP-01S V2 Wireless (4K)", length: 120.0, width: 63.0, height: 37.0, weight: 68, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "VAXEE", model: "Outset AX", length: 117.4, width: 66.0, height: 43.0, weight: 76, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "VAXEE", model: "Outset AX Wireless (4K)", length: 117.4, width: 66.0, height: 43.0, weight: 73, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },
  { brand: "VAXEE", model: "E1 Wireless (4K)", length: 120.0, width: 65.0, height: 42.0, weight: 61, shape: "Ergonomic (Right-hand)", hump: "Center", price: null },

  // ATK
  { brand: "ATK", model: "Blazing Sky Duckbill", length: 118.0, width: 55.0, height: 37.4, weight: 46, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "ATK", model: "Dragonfly A9", length: 119.6, width: 61.0, height: 36.3, weight: 42, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "ATK", model: "Blazing Sky F1", length: 118.2, width: 62.4, height: 38.8, weight: 45, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "ATK", model: "Blazing Sky X1", length: 127.0, width: 64.0, height: 40.0, weight: 52, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "ATK", model: "Blazing Sky U2", length: 119.6, width: 61.0, height: 36.3, weight: 44, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "ATK", model: "Blazing Sky Z1", length: 125.0, width: 65.0, height: 40.0, weight: 55, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "ATK", model: "Fierce X", length: 119.6, width: 61.0, height: 36.3, weight: 42, shape: "Symmetrical", hump: "Low", price: null },

  // Glorious
  { brand: "Glorious", model: "Model O Eternal", length: 128.0, width: 66.0, height: 37.5, weight: 67, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model O 2 Wireless", length: 126.0, width: 66.0, height: 38.0, weight: 68, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model O 2 Wired", length: 126.0, width: 66.0, height: 38.0, weight: 59, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model O 2 PRO Series", length: 126.0, width: 66.0, height: 38.0, weight: 59, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model O 2 PRO Series 4K/8K Edition", length: 126.0, width: 66.0, height: 38.0, weight: 68, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model O 2 Mini Wireless", length: 120.0, width: 62.0, height: 36.0, weight: 57, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model O 2 Mini Wired", length: 120.0, width: 62.0, height: 36.0, weight: 50, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model O", length: 128.0, width: 66.0, height: 37.5, weight: 67, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model O Minus", length: 120.0, width: 63.0, height: 36.0, weight: 58, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model O Wireless", length: 128.0, width: 66.0, height: 37.5, weight: 69, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model O Minus Wireless", length: 120.0, width: 63.0, height: 36.0, weight: 65, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "Glorious", model: "Model D 2 Wireless", length: 127.0, width: 67.0, height: 42.0, weight: 66, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "Glorious", model: "Model D 2 Wired", length: 127.0, width: 67.0, height: 42.0, weight: 58, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "Glorious", model: "Model D 2 PRO Series", length: 127.0, width: 67.0, height: 42.0, weight: 60, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "Glorious", model: "Model D 2 PRO Series 4K/8K Edition", length: 127.0, width: 67.0, height: 42.0, weight: 64, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "Glorious", model: "Model D Minus Wired", length: 120.0, width: 67.0, height: 40.0, weight: 61, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "Glorious", model: "Model D Minus Wireless", length: 120.0, width: 67.0, height: 40.0, weight: 65, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "Glorious", model: "Model D Wired", length: 128.0, width: 67.0, height: 42.0, weight: 69, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "Glorious", model: "Model I 2 Wired", length: 130.0, width: 66.0, height: 40.0, weight: 66, shape: "Ergonomic (Right-hand, MMO)", hump: "High", price: null },
  { brand: "Glorious", model: "Model I 2 Wireless", length: 130.0, width: 66.0, height: 40.0, weight: 75, shape: "Ergonomic (Right-hand, MMO)", hump: "High", price: null },
  { brand: "Glorious", model: "Model I Wired", length: 130.0, width: 66.0, height: 40.0, weight: 110, shape: "Ergonomic (Right-hand, MMO)", hump: "High", price: null },

  // ASUS ROG
  { brand: "ASUS ROG", model: "ROG Keris II Origin", length: 118.0, width: 62.0, height: 39.0, weight: 75, shape: "Symmetrical", hump: "Center", price: null },
  { brand: "ASUS ROG", model: "ROG Harpe Ace Extreme", length: 127.0, width: 63.0, height: 40.0, weight: 54, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "ASUS ROG", model: "ROG Harpe Ace Mini", length: 115.0, width: 59.0, height: 38.0, weight: 52, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "ASUS ROG", model: "ROG Keris II Ace", length: 118.0, width: 62.0, height: 39.0, weight: 70, shape: "Symmetrical", hump: "Center", price: null },
  { brand: "ASUS ROG", model: "ROG Strix Impact III Wireless", length: 120.0, width: 62.0, height: 38.0, weight: 79, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "ASUS ROG", model: "ROG Gladius III Wireless AimPoint EVA-02 Edition", length: 126.0, width: 67.0, height: 45.0, weight: 79, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "ASUS ROG", model: "ROG Harpe Ace Aim Lab Edition", length: 127.0, width: 63.0, height: 40.0, weight: 54, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "ASUS ROG", model: "ROG Keris Wireless AimPoint", length: 118.0, width: 62.0, height: 39.0, weight: 79, shape: "Symmetrical", hump: "Center", price: null },
  { brand: "ASUS ROG", model: "ROG Chakram X Origin", length: 132.0, width: 76.0, height: 42.0, weight: 127, shape: "Ergonomic (Right-hand, thumb stick)", hump: "High", price: null },
  { brand: "ASUS ROG", model: "ROG Spatha X", length: 137.0, width: 89.0, height: 45.0, weight: 168, shape: "Ergonomic (Right-hand, MMO)", hump: "High", price: null },
  { brand: "ASUS ROG", model: "ROG Gladius III Wireless", length: 126.0, width: 67.0, height: 45.0, weight: 89, shape: "Ergonomic (Right-hand)", hump: "High", price: null },
  { brand: "ASUS ROG", model: "ROG Chakram", length: 132.0, width: 76.0, height: 42.0, weight: 121, shape: "Ergonomic (Right-hand, thumb stick)", hump: "High", price: null },

  // BenQ ZOWIE
  { brand: "BenQ ZOWIE", model: "EC-DW", length: 128.0, width: 69.0, height: 43.0, weight: 77, shape: "Ergonomic (Right-hand)", hump: "Back", price: null },
  { brand: "BenQ ZOWIE", model: "EC-CW", length: 128.0, width: 69.0, height: 43.0, weight: 77, shape: "Ergonomic (Right-hand)", hump: "Back", price: null },
  { brand: "BenQ ZOWIE", model: "EC1-C", length: 128.0, width: 69.0, height: 43.0, weight: 80, shape: "Ergonomic (Right-hand)", hump: "Back", price: null },
  { brand: "BenQ ZOWIE", model: "EC2-C", length: 123.0, width: 65.0, height: 42.0, weight: 73, shape: "Ergonomic (Right-hand)", hump: "Back", price: null },
  { brand: "BenQ ZOWIE", model: "EC3-C", length: 119.0, width: 63.0, height: 41.0, weight: 70, shape: "Ergonomic (Right-hand)", hump: "Back", price: null },
  { brand: "BenQ ZOWIE", model: "FK2-DW", length: 124.0, width: 64.0, height: 36.0, weight: 73, shape: "Symmetrical (Ambidextrous)", hump: "Low", price: null },
  { brand: "BenQ ZOWIE", model: "FK1+", length: 128.0, width: 68.0, height: 37.0, weight: 95, shape: "Symmetrical (Ambidextrous)", hump: "Low", price: null },
  { brand: "BenQ ZOWIE", model: "FK1", length: 128.0, width: 67.0, height: 37.0, weight: 90, shape: "Symmetrical (Ambidextrous)", hump: "Low", price: null },
  { brand: "BenQ ZOWIE", model: "FK2", length: 124.0, width: 64.0, height: 36.0, weight: 85, shape: "Symmetrical (Ambidextrous)", hump: "Low", price: null },
  { brand: "BenQ ZOWIE", model: "ZA13-DW", length: 120.0, width: 62.0, height: 38.0, weight: 76, shape: "Symmetrical (High-hump)", hump: "High (Back)", price: null },
  { brand: "BenQ ZOWIE", model: "ZA11", length: 128.0, width: 67.0, height: 40.0, weight: 85, shape: "Symmetrical (High-hump)", hump: "High (Back)", price: null },
  { brand: "BenQ ZOWIE", model: "ZA12", length: 124.0, width: 66.0, height: 40.0, weight: 80, shape: "Symmetrical (High-hump)", hump: "High (Back)", price: null },
  { brand: "BenQ ZOWIE", model: "ZA13", length: 120.0, width: 62.0, height: 38.0, weight: 76, shape: "Symmetrical (High-hump)", hump: "High (Back)", price: null },
  { brand: "BenQ ZOWIE", model: "S2-DW", length: 122.0, width: 64.0, height: 38.0, weight: 73, shape: "Symmetrical (Medium-hump)", hump: "Medium", price: null },
  { brand: "BenQ ZOWIE", model: "S1", length: 126.0, width: 66.0, height: 39.0, weight: 87, shape: "Symmetrical (Medium-hump)", hump: "Medium", price: null },
  { brand: "BenQ ZOWIE", model: "S2", length: 122.0, width: 64.0, height: 38.0, weight: 82, shape: "Symmetrical (Medium-hump)", hump: "Medium", price: null },
  { brand: "BenQ ZOWIE", model: "U2-DW", length: 120.0, width: 60.0, height: 38.0, weight: 76, shape: "Symmetrical (Small)", hump: "Low", price: null },
  { brand: "BenQ ZOWIE", model: "U2", length: 120.0, width: 60.0, height: 38.0, weight: 82, shape: "Symmetrical (Small)", hump: "Low", price: null },

  // LAMZU
  { brand: "LAMZU", model: "Paro", length: 124.0, width: 63.0, height: 38.0, weight: 55, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Paro Aurora", length: 124.0, width: 63.0, height: 38.0, weight: 55, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Paro Aurora SE", length: 124.0, width: 63.0, height: 38.0, weight: 55, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "REJECT Paro 8K", length: 124.0, width: 63.0, height: 38.0, weight: 55, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Inca", length: 118.0, width: 60.0, height: 38.0, weight: 55, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Tachi", length: 124.0, width: 65.0, height: 39.0, weight: 60, shape: "Ergonomic (Right-hand)", hump: "Back", price: null },
  { brand: "LAMZU", model: "Maya", length: 122.0, width: 61.0, height: 38.0, weight: 53, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "LAMZU", model: "Maya 4K", length: 122.0, width: 61.0, height: 38.0, weight: 53, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "LAMZU", model: "Maya Doodle", length: 122.0, width: 61.0, height: 38.0, weight: 53, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "LAMZU", model: "Maya X", length: 122.0, width: 61.0, height: 38.0, weight: 53, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "LAMZU", model: "AIMLABS | Maya X", length: 122.0, width: 61.0, height: 38.0, weight: 53, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "LAMZU", model: "Thorn (4K Compatible)", length: 123.0, width: 66.0, height: 38.0, weight: 60, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Thorn 4K", length: 123.0, width: 66.0, height: 38.0, weight: 60, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Lamzu x Fnatic Thorn 4K", length: 123.0, width: 66.0, height: 38.0, weight: 60, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Atlantis", length: 123.0, width: 66.0, height: 38.0, weight: 55, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Atlantis OG V2", length: 123.0, width: 66.0, height: 38.0, weight: 55, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Atlantis OG V2 Pro", length: 123.0, width: 66.0, height: 38.0, weight: 55, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Atlantis OG V2 4K", length: 123.0, width: 66.0, height: 38.0, weight: 55, shape: "Symmetrical", hump: "Medium", price: null },
  { brand: "LAMZU", model: "Atlantis Mini Pro", length: 117.0, width: 63.0, height: 37.0, weight: 49, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "LAMZU", model: "Atlantis Mini 4K", length: 117.0, width: 63.0, height: 37.0, weight: 49, shape: "Symmetrical", hump: "Low", price: null },
  { brand: "LAMZU", model: "Atlantis Mini [Champion Edition]", length: 117.0, width: 63.0, height: 37.0, weight: 49, shape: "Symmetrical", hump: "Low", price: null }
];
// --- keep your original array above ---
// Normalized export for the app:
export const MICE = (Array.isArray(mice) ? mice : []).map(m => ({
  brand: m.brand || "",
  model: m.model || "",
  length_mm: Number(m.length ?? m.length_mm ?? 0),
  width_mm:  Number(m.width  ?? m.width_mm  ?? 0),
  height_mm: Number(m.height ?? m.height_mm ?? 0),
  weight_g:  Number(m.weight ?? m.weight_g  ?? 0),
  shape: (() => {
    const s = String(m.shape || "").toLowerCase();
    if (s.includes("sym")) return "sym";
    if (s.includes("ergo")) return "ergo";
    return s || "sym";
  })(),
  hump: m.hump || "",
  price: m.price ?? m.price_usd ?? m.usd ?? m.msrp ?? null,
  tags: m.tags || []
}));
