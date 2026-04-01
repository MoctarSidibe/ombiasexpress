/**
 * Countries list for phone number picker.
 * `placeholder` = local number example (no leading zero, no country code).
 * Ordered: CEMAC first → all Africa → Europe → Americas → Asia / Middle East.
 */

export const COUNTRIES = [

    // ── CEMAC / Central Africa (priority) ──────────────────────────────────
    { code: 'GA', name: 'Gabon',                dial: '241', flag: '🇬🇦', placeholder: '77 72 44 99'   },
    { code: 'CM', name: 'Cameroun',              dial: '237', flag: '🇨🇲', placeholder: '671 23 45 67'  },
    { code: 'CG', name: 'Congo',                 dial: '242', flag: '🇨🇬', placeholder: '61 23 45 67'   },
    { code: 'CD', name: 'R.D. Congo',            dial: '243', flag: '🇨🇩', placeholder: '812 34 56 78'  },
    { code: 'GQ', name: 'Guinée Équatoriale',    dial: '240', flag: '🇬🇶', placeholder: '222 12 34 56'  },
    { code: 'CF', name: 'Centrafrique',          dial: '236', flag: '🇨🇫', placeholder: '75 12 34 56'   },
    { code: 'TD', name: 'Tchad',                 dial: '235', flag: '🇹🇩', placeholder: '63 12 34 56'   },

    // ── West Africa ─────────────────────────────────────────────────────────
    { code: 'CI', name: "Côte d'Ivoire",         dial: '225', flag: '🇨🇮', placeholder: '712 34 56 78'  },
    { code: 'SN', name: 'Sénégal',               dial: '221', flag: '🇸🇳', placeholder: '77 123 45 67'  },
    { code: 'ML', name: 'Mali',                  dial: '223', flag: '🇲🇱', placeholder: '76 12 34 56'   },
    { code: 'BJ', name: 'Bénin',                 dial: '229', flag: '🇧🇯', placeholder: '97 12 34 56'   },
    { code: 'TG', name: 'Togo',                  dial: '228', flag: '🇹🇬', placeholder: '90 12 34 56'   },
    { code: 'GN', name: 'Guinée',                dial: '224', flag: '🇬🇳', placeholder: '622 12 34 56'  },
    { code: 'GW', name: 'Guinée-Bissau',         dial: '245', flag: '🇬🇼', placeholder: '955 12 34 56'  },
    { code: 'BF', name: 'Burkina Faso',          dial: '226', flag: '🇧🇫', placeholder: '76 12 34 56'   },
    { code: 'NE', name: 'Niger',                 dial: '227', flag: '🇳🇪', placeholder: '96 12 34 56'   },
    { code: 'MR', name: 'Mauritanie',            dial: '222', flag: '🇲🇷', placeholder: '36 12 34 56'   },
    { code: 'SL', name: 'Sierra Leone',          dial: '232', flag: '🇸🇱', placeholder: '76 12 34 56'   },
    { code: 'LR', name: 'Liberia',               dial: '231', flag: '🇱🇷', placeholder: '880 12 34 56'  },
    { code: 'GH', name: 'Ghana',                 dial: '233', flag: '🇬🇭', placeholder: '541 23 45 67'  },
    { code: 'NG', name: 'Nigeria',               dial: '234', flag: '🇳🇬', placeholder: '801 234 5678'  },
    { code: 'GM', name: 'Gambie',                dial: '220', flag: '🇬🇲', placeholder: '301 23 45'     },
    { code: 'CV', name: 'Cap-Vert',              dial: '238', flag: '🇨🇻', placeholder: '991 23 45'     },
    { code: 'ST', name: 'São Tomé-et-Príncipe',  dial: '239', flag: '🇸🇹', placeholder: '981 23 45'     },

    // ── East Africa ─────────────────────────────────────────────────────────
    { code: 'KE', name: 'Kenya',                 dial: '254', flag: '🇰🇪', placeholder: '712 34 56 78'  },
    { code: 'TZ', name: 'Tanzanie',              dial: '255', flag: '🇹🇿', placeholder: '712 34 56 78'  },
    { code: 'ET', name: 'Éthiopie',              dial: '251', flag: '🇪🇹', placeholder: '911 23 45 67'  },
    { code: 'RW', name: 'Rwanda',                dial: '250', flag: '🇷🇼', placeholder: '781 23 45 67'  },
    { code: 'UG', name: 'Ouganda',               dial: '256', flag: '🇺🇬', placeholder: '712 34 56 78'  },
    { code: 'BI', name: 'Burundi',               dial: '257', flag: '🇧🇮', placeholder: '79 12 34 56'   },
    { code: 'SO', name: 'Somalie',               dial: '252', flag: '🇸🇴', placeholder: '61 12 34 56'   },
    { code: 'DJ', name: 'Djibouti',              dial: '253', flag: '🇩🇯', placeholder: '77 12 34 56'   },
    { code: 'ER', name: 'Érythrée',              dial: '291', flag: '🇪🇷', placeholder: '712 34 56'     },
    { code: 'SS', name: 'Soudan du Sud',         dial: '211', flag: '🇸🇸', placeholder: '912 34 56 78'  },
    { code: 'SD', name: 'Soudan',                dial: '249', flag: '🇸🇩', placeholder: '912 34 56 78'  },

    // ── Southern Africa ─────────────────────────────────────────────────────
    { code: 'ZA', name: 'Afrique du Sud',        dial: '27',  flag: '🇿🇦', placeholder: '71 234 5678'   },
    { code: 'MG', name: 'Madagascar',            dial: '261', flag: '🇲🇬', placeholder: '32 12 34 567'  },
    { code: 'MZ', name: 'Mozambique',            dial: '258', flag: '🇲🇿', placeholder: '82 123 4567'   },
    { code: 'ZM', name: 'Zambie',                dial: '260', flag: '🇿🇲', placeholder: '97 123 4567'   },
    { code: 'ZW', name: 'Zimbabwe',              dial: '263', flag: '🇿🇼', placeholder: '71 234 5678'   },
    { code: 'AO', name: 'Angola',                dial: '244', flag: '🇦🇴', placeholder: '923 12 34 56'  },
    { code: 'MW', name: 'Malawi',                dial: '265', flag: '🇲🇼', placeholder: '999 12 34 56'  },
    { code: 'BW', name: 'Botswana',              dial: '267', flag: '🇧🇼', placeholder: '71 234 567'    },
    { code: 'NA', name: 'Namibie',               dial: '264', flag: '🇳🇦', placeholder: '81 234 5678'   },
    { code: 'SZ', name: 'Eswatini',              dial: '268', flag: '🇸🇿', placeholder: '76 123 456'    },
    { code: 'LS', name: 'Lesotho',               dial: '266', flag: '🇱🇸', placeholder: '58 12 34 56'   },
    { code: 'SC', name: 'Seychelles',            dial: '248', flag: '🇸🇨', placeholder: '251 2345'      },
    { code: 'MU', name: 'Maurice',               dial: '230', flag: '🇲🇺', placeholder: '5712 3456'     },
    { code: 'KM', name: 'Comores',               dial: '269', flag: '🇰🇲', placeholder: '321 23 45'     },
    { code: 'RE', name: 'La Réunion',            dial: '262', flag: '🇷🇪', placeholder: '692 12 34 56'  },
    { code: 'YT', name: 'Mayotte',               dial: '269', flag: '🇾🇹', placeholder: '639 12 34 56'  },

    // ── North Africa ────────────────────────────────────────────────────────
    { code: 'MA', name: 'Maroc',                 dial: '212', flag: '🇲🇦', placeholder: '612 34 56 78'  },
    { code: 'DZ', name: 'Algérie',               dial: '213', flag: '🇩🇿', placeholder: '551 23 45 67'  },
    { code: 'TN', name: 'Tunisie',               dial: '216', flag: '🇹🇳', placeholder: '21 234 567'    },
    { code: 'LY', name: 'Libye',                 dial: '218', flag: '🇱🇾', placeholder: '91 234 5678'   },
    { code: 'EG', name: 'Égypte',                dial: '20',  flag: '🇪🇬', placeholder: '101 234 5678'  },

    // ── Western Europe ──────────────────────────────────────────────────────
    { code: 'FR', name: 'France',                dial: '33',  flag: '🇫🇷', placeholder: '612 34 56 78'  },
    { code: 'BE', name: 'Belgique',              dial: '32',  flag: '🇧🇪', placeholder: '471 23 45 67'  },
    { code: 'CH', name: 'Suisse',                dial: '41',  flag: '🇨🇭', placeholder: '791 23 45 67'  },
    { code: 'LU', name: 'Luxembourg',            dial: '352', flag: '🇱🇺', placeholder: '621 23 45 67'  },
    { code: 'PT', name: 'Portugal',              dial: '351', flag: '🇵🇹', placeholder: '912 34 56 78'  },
    { code: 'ES', name: 'Espagne',               dial: '34',  flag: '🇪🇸', placeholder: '612 34 56 78'  },
    { code: 'IT', name: 'Italie',                dial: '39',  flag: '🇮🇹', placeholder: '312 345 6789'  },
    { code: 'DE', name: 'Allemagne',             dial: '49',  flag: '🇩🇪', placeholder: '1512 3456 789' },
    { code: 'NL', name: 'Pays-Bas',              dial: '31',  flag: '🇳🇱', placeholder: '612 34 56 78'  },
    { code: 'GB', name: 'Royaume-Uni',           dial: '44',  flag: '🇬🇧', placeholder: '7123 456 789'  },
    { code: 'IE', name: 'Irlande',               dial: '353', flag: '🇮🇪', placeholder: '85 123 4567'   },
    { code: 'AT', name: 'Autriche',              dial: '43',  flag: '🇦🇹', placeholder: '664 123 4567'  },
    { code: 'MC', name: 'Monaco',                dial: '377', flag: '🇲🇨', placeholder: '612 34 56 78'  },
    { code: 'GF', name: 'Guyane française',      dial: '594', flag: '🇬🇫', placeholder: '694 12 34 56'  },
    { code: 'GP', name: 'Guadeloupe',            dial: '590', flag: '🇬🇵', placeholder: '690 12 34 56'  },
    { code: 'MQ', name: 'Martinique',            dial: '596', flag: '🇲🇶', placeholder: '696 12 34 56'  },
    { code: 'PM', name: 'Saint-Pierre-et-Miq.',  dial: '508', flag: '🇵🇲', placeholder: '55 12 34'      },
    { code: 'NC', name: 'Nouvelle-Calédonie',    dial: '687', flag: '🇳🇨', placeholder: '79 12 34'      },
    { code: 'PF', name: 'Polynésie française',   dial: '689', flag: '🇵🇫', placeholder: '89 12 34 56'   },
    { code: 'WF', name: 'Wallis-et-Futuna',      dial: '681', flag: '🇼🇫', placeholder: '82 12 34'      },

    // ── Northern / Eastern Europe ────────────────────────────────────────────
    { code: 'SE', name: 'Suède',                 dial: '46',  flag: '🇸🇪', placeholder: '70 123 45 67'  },
    { code: 'NO', name: 'Norvège',               dial: '47',  flag: '🇳🇴', placeholder: '912 34 567'    },
    { code: 'DK', name: 'Danemark',              dial: '45',  flag: '🇩🇰', placeholder: '20 12 34 56'   },
    { code: 'FI', name: 'Finlande',              dial: '358', flag: '🇫🇮', placeholder: '41 123 4567'   },
    { code: 'PL', name: 'Pologne',               dial: '48',  flag: '🇵🇱', placeholder: '512 345 678'   },
    { code: 'RU', name: 'Russie',                dial: '7',   flag: '🇷🇺', placeholder: '912 345 6789'  },
    { code: 'UA', name: 'Ukraine',               dial: '380', flag: '🇺🇦', placeholder: '50 123 45 67'  },
    { code: 'RO', name: 'Roumanie',              dial: '40',  flag: '🇷🇴', placeholder: '712 345 678'   },
    { code: 'TR', name: 'Turquie',               dial: '90',  flag: '🇹🇷', placeholder: '532 123 4567'  },
    { code: 'GR', name: 'Grèce',                dial: '30',  flag: '🇬🇷', placeholder: '691 234 5678'  },

    // ── Americas ────────────────────────────────────────────────────────────
    { code: 'US', name: 'États-Unis',            dial: '1',   flag: '🇺🇸', placeholder: '202 555 1234'  },
    { code: 'CA', name: 'Canada',                dial: '1',   flag: '🇨🇦', placeholder: '514 123 4567'  },
    { code: 'MX', name: 'Mexique',               dial: '52',  flag: '🇲🇽', placeholder: '55 1234 5678'  },
    { code: 'BR', name: 'Brésil',                dial: '55',  flag: '🇧🇷', placeholder: '11 91234 5678' },
    { code: 'CO', name: 'Colombie',              dial: '57',  flag: '🇨🇴', placeholder: '300 123 4567'  },
    { code: 'AR', name: 'Argentine',             dial: '54',  flag: '🇦🇷', placeholder: '11 1234 5678'  },
    { code: 'HT', name: 'Haïti',                dial: '509', flag: '🇭🇹', placeholder: '34 12 34 56'   },

    // ── Middle East ─────────────────────────────────────────────────────────
    { code: 'LB', name: 'Liban',                 dial: '961', flag: '🇱🇧', placeholder: '71 123 456'    },
    { code: 'AE', name: 'Émirats Arabes Unis',   dial: '971', flag: '🇦🇪', placeholder: '50 123 4567'   },
    { code: 'SA', name: 'Arabie Saoudite',       dial: '966', flag: '🇸🇦', placeholder: '51 234 5678'   },
    { code: 'QA', name: 'Qatar',                 dial: '974', flag: '🇶🇦', placeholder: '33 12 34 56'   },

    // ── Asia ────────────────────────────────────────────────────────────────
    { code: 'CN', name: 'Chine',                 dial: '86',  flag: '🇨🇳', placeholder: '131 2345 6789' },
    { code: 'IN', name: 'Inde',                  dial: '91',  flag: '🇮🇳', placeholder: '912 345 6789'  },
    { code: 'JP', name: 'Japon',                 dial: '81',  flag: '🇯🇵', placeholder: '90 1234 5678'  },
];
