/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CountryOption {
  code: string;
  name: string;
  dial: string;
}

// Comprehensive list of all countries & international territories with dial codes
export const COUNTRIES: CountryOption[] = [
  { code: 'AF', name: 'Afghanistan', dial: '+93' },
  { code: 'AL', name: 'Albania', dial: '+355' },
  { code: 'DZ', name: 'Algeria', dial: '+213' },
  { code: 'AS', name: 'American Samoa', dial: '+1-684' },
  { code: 'AD', name: 'Andorra', dial: '+376' },
  { code: 'AO', name: 'Angola', dial: '+244' },
  { code: 'AI', name: 'Anguilla', dial: '+1-264' },
  { code: 'AG', name: 'Antigua and Barbuda', dial: '+1-268' },
  { code: 'AR', name: 'Argentina', dial: '+54' },
  { code: 'AM', name: 'Armenia', dial: '+374' },
  { code: 'AW', name: 'Aruba', dial: '+297' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'AT', name: 'Austria', dial: '+43' },
  { code: 'AZ', name: 'Azerbaijan', dial: '+994' },
  { code: 'BS', name: 'Bahamas', dial: '+1-242' },
  { code: 'BH', name: 'Bahrain', dial: '+973' },
  { code: 'BD', name: 'Bangladesh', dial: '+880' },
  { code: 'BB', name: 'Barbados', dial: '+1-246' },
  { code: 'BY', name: 'Belarus', dial: '+375' },
  { code: 'BE', name: 'Belgium', dial: '+32' },
  { code: 'BZ', name: 'Belize', dial: '+501' },
  { code: 'BJ', name: 'Benin', dial: '+229' },
  { code: 'BM', name: 'Bermuda', dial: '+1-441' },
  { code: 'BT', name: 'Bhutan', dial: '+975' },
  { code: 'BO', name: 'Bolivia', dial: '+591' },
  { code: 'BA', name: 'Bosnia and Herzegovina', dial: '+387' },
  { code: 'BW', name: 'Botswana', dial: '+267' },
  { code: 'BR', name: 'Brazil', dial: '+55' },
  { code: 'IO', name: 'British Indian Ocean Territory', dial: '+246' },
  { code: 'VG', name: 'British Virgin Islands', dial: '+1-284' },
  { code: 'BN', name: 'Brunei', dial: '+673' },
  { code: 'BG', name: 'Bulgaria', dial: '+359' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226' },
  { code: 'BI', name: 'Burundi', dial: '+257' },
  { code: 'KH', name: 'Cambodia', dial: '+855' },
  { code: 'CM', name: 'Cameroon', dial: '+237' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'CV', name: 'Cape Verde', dial: '+238' },
  { code: 'KY', name: 'Cayman Islands', dial: '+1-345' },
  { code: 'CF', name: 'Central African Republic', dial: '+236' },
  { code: 'TD', name: 'Chad', dial: '+235' },
  { code: 'CL', name: 'Chile', dial: '+56' },
  { code: 'CN', name: 'China', dial: '+86' },
  { code: 'CO', name: 'Colombia', dial: '+57' },
  { code: 'KM', name: 'Comoros', dial: '+269' },
  { code: 'CG', name: 'Congo', dial: '+242' },
  { code: 'CD', name: 'Congo (DRC)', dial: '+243' },
  { code: 'CK', name: 'Cook Islands', dial: '+682' },
  { code: 'CR', name: 'Costa Rica', dial: '+506' },
  { code: 'CI', name: "Cote d'Ivoire", dial: '+225' },
  { code: 'HR', name: 'Croatia', dial: '+385' },
  { code: 'CU', name: 'Cuba', dial: '+53' },
  { code: 'CW', name: 'Curacao', dial: '+599' },
  { code: 'CY', name: 'Cyprus', dial: '+357' },
  { code: 'CZ', name: 'Czech Republic', dial: '+420' },
  { code: 'DK', name: 'Denmark', dial: '+45' },
  { code: 'DJ', name: 'Djibouti', dial: '+253' },
  { code: 'DM', name: 'Dominica', dial: '+1-767' },
  { code: 'DO', name: 'Dominican Republic', dial: '+1-809' },
  { code: 'EC', name: 'Ecuador', dial: '+593' },
  { code: 'EG', name: 'Egypt', dial: '+20' },
  { code: 'SV', name: 'El Salvador', dial: '+503' },
  { code: 'GQ', name: 'Equatorial Guinea', dial: '+240' },
  { code: 'ER', name: 'Eritrea', dial: '+291' },
  { code: 'EE', name: 'Estonia', dial: '+372' },
  { code: 'SZ', name: 'Eswatini', dial: '+268' },
  { code: 'ET', name: 'Ethiopia', dial: '+251' },
  { code: 'FO', name: 'Faroe Islands', dial: '+298' },
  { code: 'FJ', name: 'Fiji', dial: '+679' },
  { code: 'FI', name: 'Finland', dial: '+358' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'GF', name: 'French Guiana', dial: '+594' },
  { code: 'PF', name: 'French Polynesia', dial: '+689' },
  { code: 'GA', name: 'Gabon', dial: '+241' },
  { code: 'GM', name: 'Gambia', dial: '+220' },
  { code: 'GE', name: 'Georgia', dial: '+995' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'GH', name: 'Ghana', dial: '+233' },
  { code: 'GI', name: 'Gibraltar', dial: '+350' },
  { code: 'GR', name: 'Greece', dial: '+30' },
  { code: 'GL', name: 'Greenland', dial: '+299' },
  { code: 'GD', name: 'Grenada', dial: '+1-473' },
  { code: 'GP', name: 'Guadeloupe', dial: '+590' },
  { code: 'GU', name: 'Guam', dial: '+1-671' },
  { code: 'GT', name: 'Guatemala', dial: '+502' },
  { code: 'GG', name: 'Guernsey', dial: '+44-1481' },
  { code: 'GN', name: 'Guinea', dial: '+224' },
  { code: 'GW', name: 'Guinea-Bissau', dial: '+245' },
  { code: 'GY', name: 'Guyana', dial: '+592' },
  { code: 'HT', name: 'Haiti', dial: '+509' },
  { code: 'HN', name: 'Honduras', dial: '+504' },
  { code: 'HK', name: 'Hong Kong', dial: '+852' },
  { code: 'HU', name: 'Hungary', dial: '+36' },
  { code: 'IS', name: 'Iceland', dial: '+354' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'IR', name: 'Iran', dial: '+98' },
  { code: 'IQ', name: 'Iraq', dial: '+964' },
  { code: 'IE', name: 'Ireland', dial: '+353' },
  { code: 'IM', name: 'Isle of Man', dial: '+44-1624' },
  { code: 'IL', name: 'Israel', dial: '+972' },
  { code: 'IT', name: 'Italy', dial: '+39' },
  { code: 'JM', name: 'Jamaica', dial: '+1-876' },
  { code: 'JP', name: 'Japan', dial: '+81' },
  { code: 'JE', name: 'Jersey', dial: '+44-1534' },
  { code: 'JO', name: 'Jordan', dial: '+962' },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7' },
  { code: 'KE', name: 'Kenya', dial: '+254' },
  { code: 'KI', name: 'Kiribati', dial: '+686' },
  { code: 'XK', name: 'Kosovo', dial: '+383' },
  { code: 'KW', name: 'Kuwait', dial: '+965' },
  { code: 'KG', name: 'Kyrgyzstan', dial: '+996' },
  { code: 'LA', name: 'Laos', dial: '+856' },
  { code: 'LV', name: 'Latvia', dial: '+371' },
  { code: 'LB', name: 'Lebanon', dial: '+961' },
  { code: 'LS', name: 'Lesotho', dial: '+266' },
  { code: 'LR', name: 'Liberia', dial: '+231' },
  { code: 'LY', name: 'Libya', dial: '+218' },
  { code: 'LI', name: 'Liechtenstein', dial: '+423' },
  { code: 'LT', name: 'Lithuania', dial: '+370' },
  { code: 'LU', name: 'Luxembourg', dial: '+352' },
  { code: 'MO', name: 'Macau', dial: '+853' },
  { code: 'MG', name: 'Madagascar', dial: '+261' },
  { code: 'MW', name: 'Malawi', dial: '+265' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'MV', name: 'Maldives', dial: '+960' },
  { code: 'ML', name: 'Mali', dial: '+223' },
  { code: 'MT', name: 'Malta', dial: '+356' },
  { code: 'MH', name: 'Marshall Islands', dial: '+692' },
  { code: 'MQ', name: 'Martinique', dial: '+596' },
  { code: 'MR', name: 'Mauritania', dial: '+222' },
  { code: 'MU', name: 'Mauritius', dial: '+230' },
  { code: 'YT', name: 'Mayotte', dial: '+262' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'FM', name: 'Micronesia', dial: '+691' },
  { code: 'MD', name: 'Moldova', dial: '+373' },
  { code: 'MC', name: 'Monaco', dial: '+377' },
  { code: 'MN', name: 'Mongolia', dial: '+976' },
  { code: 'ME', name: 'Montenegro', dial: '+382' },
  { code: 'MS', name: 'Montserrat', dial: '+1-664' },
  { code: 'MA', name: 'Morocco', dial: '+212' },
  { code: 'MZ', name: 'Mozambique', dial: '+258' },
  { code: 'MM', name: 'Myanmar', dial: '+95' },
  { code: 'NA', name: 'Namibia', dial: '+264' },
  { code: 'NR', name: 'Nauru', dial: '+674' },
  { code: 'NP', name: 'Nepal', dial: '+977' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'NC', name: 'New Caledonia', dial: '+687' },
  { code: 'NZ', name: 'New Zealand', dial: '+64' },
  { code: 'NI', name: 'Nicaragua', dial: '+505' },
  { code: 'NE', name: 'Niger', dial: '+227' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'NU', name: 'Niue', dial: '+683' },
  { code: 'NF', name: 'Norfolk Island', dial: '+672' },
  { code: 'KP', name: 'North Korea', dial: '+850' },
  { code: 'MK', name: 'North Macedonia', dial: '+389' },
  { code: 'MP', name: 'Northern Mariana Islands', dial: '+1-670' },
  { code: 'NO', name: 'Norway', dial: '+47' },
  { code: 'OM', name: 'Oman', dial: '+968' },
  { code: 'PK', name: 'Pakistan', dial: '+92' },
  { code: 'PW', name: 'Palau', dial: '+680' },
  { code: 'PS', name: 'Palestine', dial: '+970' },
  { code: 'PA', name: 'Panama', dial: '+507' },
  { code: 'PG', name: 'Papua New Guinea', dial: '+675' },
  { code: 'PY', name: 'Paraguay', dial: '+595' },
  { code: 'PE', name: 'Peru', dial: '+51' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'PL', name: 'Poland', dial: '+48' },
  { code: 'PT', name: 'Portugal', dial: '+351' },
  { code: 'PR', name: 'Puerto Rico', dial: '+1-787' },
  { code: 'QA', name: 'Qatar', dial: '+974' },
  { code: 'RE', name: 'Reunion', dial: '+262' },
  { code: 'RO', name: 'Romania', dial: '+40' },
  { code: 'RU', name: 'Russia', dial: '+7' },
  { code: 'RW', name: 'Rwanda', dial: '+250' },
  { code: 'BL', name: 'Saint Barthelemy', dial: '+590' },
  { code: 'SH', name: 'Saint Helena', dial: '+290' },
  { code: 'KN', name: 'Saint Kitts and Nevis', dial: '+1-869' },
  { code: 'LC', name: 'Saint Lucia', dial: '+1-758' },
  { code: 'MF', name: 'Saint Martin', dial: '+590' },
  { code: 'PM', name: 'Saint Pierre and Miquelon', dial: '+508' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', dial: '+1-784' },
  { code: 'WS', name: 'Samoa', dial: '+685' },
  { code: 'SM', name: 'San Marino', dial: '+378' },
  { code: 'ST', name: 'Sao Tome and Principe', dial: '+239' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'SN', name: 'Senegal', dial: '+221' },
  { code: 'RS', name: 'Serbia', dial: '+381' },
  { code: 'SC', name: 'Seychelles', dial: '+248' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'SX', name: 'Sint Maarten', dial: '+1-721' },
  { code: 'SK', name: 'Slovakia', dial: '+421' },
  { code: 'SI', name: 'Slovenia', dial: '+386' },
  { code: 'SB', name: 'Solomon Islands', dial: '+677' },
  { code: 'SO', name: 'Somalia', dial: '+252' },
  { code: 'ZA', name: 'South Africa', dial: '+27' },
  { code: 'KR', name: 'South Korea', dial: '+82' },
  { code: 'SS', name: 'South Sudan', dial: '+211' },
  { code: 'ES', name: 'Spain', dial: '+34' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94' },
  { code: 'SD', name: 'Sudan', dial: '+249' },
  { code: 'SR', name: 'Suriname', dial: '+597' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'CH', name: 'Switzerland', dial: '+41' },
  { code: 'SY', name: 'Syria', dial: '+963' },
  { code: 'TW', name: 'Taiwan', dial: '+886' },
  { code: 'TJ', name: 'Tajikistan', dial: '+992' },
  { code: 'TZ', name: 'Tanzania', dial: '+255' },
  { code: 'TH', name: 'Thailand', dial: '+66' },
  { code: 'TL', name: 'Timor-Leste', dial: '+670' },
  { code: 'TG', name: 'Togo', dial: '+228' },
  { code: 'TK', name: 'Tokelau', dial: '+690' },
  { code: 'TO', name: 'Tonga', dial: '+676' },
  { code: 'TT', name: 'Trinidad and Tobago', dial: '+1-868' },
  { code: 'TN', name: 'Tunisia', dial: '+216' },
  { code: 'TR', name: 'Turkey', dial: '+90' },
  { code: 'TM', name: 'Turkmenistan', dial: '+993' },
  { code: 'TC', name: 'Turks and Caicos Islands', dial: '+1-649' },
  { code: 'TV', name: 'Tuvalu', dial: '+688' },
  { code: 'UG', name: 'Uganda', dial: '+256' },
  { code: 'UA', name: 'Ukraine', dial: '+380' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'UY', name: 'Uruguay', dial: '+598' },
  { code: 'UZ', name: 'Uzbekistan', dial: '+998' },
  { code: 'VU', name: 'Vanuatu', dial: '+678' },
  { code: 'VA', name: 'Vatican City', dial: '+379' },
  { code: 'VE', name: 'Venezuela', dial: '+58' },
  { code: 'VN', name: 'Vietnam', dial: '+84' },
  { code: 'VI', name: 'Virgin Islands (US)', dial: '+1-340' },
  { code: 'WF', name: 'Wallis and Futuna', dial: '+681' },
  { code: 'EH', name: 'Western Sahara', dial: '+212' },
  { code: 'YE', name: 'Yemen', dial: '+967' },
  { code: 'ZM', name: 'Zambia', dial: '+260' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263' }
];

export const PROVINCES_BY_COUNTRY: Record<string, string[]> = {
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 
    'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 
    'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 
    'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ],
  Indonesia: [
    'Aceh', 'Bali', 'Banten', 'Bengkulu', 'DI Yogyakarta', 'DKI Jakarta', 
    'Gorontalo', 'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 
    'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah', 'Kalimantan Timur', 'Kalimantan Utara', 
    'Kepulauan Bangka Belitung', 'Kepulauan Riau', 'Lampung', 'Maluku', 'Maluku Utara', 
    'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Papua', 'Papua Barat', 'Papua Pegunungan', 
    'Papua Selatan', 'Papua Tengah', 'Riau', 'Sulawesi Barat', 'Sulawesi Selatan', 
    'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara', 'Sumatera Barat', 'Sumatera Selatan', 'Sumatera Utara'
  ],
  Canada: [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 
    'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 
    'Northwest Territories', 'Nunavut', 'Yukon'
  ],
  'United Kingdom': [
    'England', 'Scotland', 'Wales', 'Northern Ireland', 'Greater London'
  ],
  Australia: [
    'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 
    'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'
  ],
  Germany: [
    'Baden-Wurttemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 
    'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 
    'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
  ],
  France: [
    'Auvergne-Rhone-Alpes', 'Bourgogne-Franche-Comte', 'Brittany', 'Centre-Val de Loire', 
    'Corsica', 'Grand Est', 'Hauts-de-France', 'Ile-de-France (Paris)', 'Normandy', 
    'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', "Provence-Alpes-Cote d'Azur"
  ],
  Japan: [
    'Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima', 'Ibaraki', 
    'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa', 'Niigata', 'Toyama', 
    'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano', 'Gifu', 'Shizuoka', 'Aichi', 'Mie', 
    'Shiga', 'Kyoto', 'Osaka', 'Hyogo', 'Nara', 'Wakayama', 'Tottori', 'Shimane', 
    'Okayama', 'Hiroshima', 'Yamaguchi', 'Tokushima', 'Kagawa', 'Ehime', 'Kochi', 
    'Fukuoka', 'Saga', 'Nagasaki', 'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa'
  ],
  India: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 
    'West Bengal', 'Delhi'
  ],
  Malaysia: [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 
    'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'
  ],
  Singapore: [
    'Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'
  ],
  Netherlands: [
    'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg', 
    'North Brabant', 'North Holland (Amsterdam)', 'Overijssel', 'South Holland (Rotterdam/The Hague)', 'Utrecht', 'Zeeland'
  ],
  Italy: [
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli Venezia Giulia', 
    'Lazio (Rome)', 'Liguria', 'Lombardy (Milan)', 'Marche', 'Molise', 'Piedmont', 
    'Puglia', 'Sardinia', 'Sicily', 'Tuscany (Florence)', 'Trentino-South Tyrol', 'Umbria', "Valle d'Aosta", 'Veneto (Venice)'
  ],
  Spain: [
    'Andalusia', 'Aragon', 'Asturias', 'Balearic Islands', 'Basque Country', 'Canary Islands', 
    'Cantabria', 'Castile and Leon', 'Castilla-La Mancha', 'Catalonia (Barcelona)', 'Extremadura', 
    'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarre', 'Valencian Community'
  ],
  Brazil: [
    'Acre', 'Alagoas', 'Amapa', 'Amazonas', 'Bahia', 'Ceara', 'Distrito Federal (Brasilia)', 
    'Espirito Santo', 'Goias', 'Maranhao', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 
    'Para', 'Paraiba', 'Parana', 'Pernambuco', 'Piaui', 'Rio de Janeiro', 'Rio Grande do Norte', 
    'Rio Grande do Sul', 'Rondonia', 'Roraima', 'Santa Catarina', 'Sao Paulo', 'Sergipe', 'Tocantins'
  ],
  Mexico: [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 
    'Coahuila', 'Colima', 'Mexico City', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 
    'Jalisco (Guadalajara)', 'Mexico State', 'Michoacan', 'Morelos', 'Nayarit', 'Nuevo Leon (Monterrey)', 
    'Oaxaca', 'Puebla', 'Queretaro', 'Quintana Roo (Cancun)', 'San Luis Potosi', 'Sinaloa', 
    'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatan', 'Zacatecas'
  ],
  'United Arab Emirates': [
    'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al-Quwain', 'Ras Al Khaimah', 'Fujairah'
  ],
  'New Zealand': [
    'Auckland', 'Bay of Plenty', 'Canterbury', 'Gisborne', "Hawke's Bay", 'Manawatu-Wanganui', 
    'Marlborough', 'Nelson', 'Northland', 'Otago', 'Southland', 'Taranaki', 'Tasman', 'Waikato', 'Wellington', 'West Coast'
  ],
  'South Korea': [
    'Seoul', 'Busan', 'Daegu', 'Incheon', 'Gwangju', 'Daejeon', 'Ulsan', 'Sejong', 
    'Gyeonggi-do', 'Gangwon-do', 'Chungcheongbuk-do', 'Chungcheongnam-do', 'Jeollabuk-do', 
    'Jeollanam-do', 'Gyeongsangbuk-do', 'Gyeongsangnam-do', 'Jeju-do'
  ]
};

// Dynamic mapping of state/province to major cities, districts, counties & subdistricts (kecamatan)
export const CITIES_BY_STATE: Record<string, string[]> = {
  // --- United States ---
  California: [
    'Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Oakland', 
    'Fresno', 'Long Beach', 'Bakersfield', 'Anaheim', 'Santa Ana', 'Riverside', 'Stockton', 
    'Irvine', 'Fremont', 'San Bernardino', 'Modesto', 'Fontana', 'Oxnard', 'Moreno Valley', 
    'Huntington Beach', 'Glendale', 'Santa Clarita', 'Garden Grove', 'Oceanside', 'Santa Rosa', 
    'Rancho Cucamonga', 'Ontario', 'Lancaster', 'Elk Grove', 'Palmdale', 'Coronado', 'Pasadena', 
    'Berkeley', 'Santa Monica', 'Beverly Hills', 'Sunnyvale', 'Santa Clara', 'Palo Alto', 'Torrance'
  ],
  'New York': [
    'New York City', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Buffalo', 
    'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon', 'Schenectady', 
    'Utica', 'White Plains', 'Hempstead', 'Troy', 'Niagara Falls', 'Binghamton', 'Ithaca'
  ],
  Texas: [
    'Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 
    'Corpus Christi', 'Plano', 'Lubbock', 'Laredo', 'Irving', 'Garland', 'Frisco', 
    'McKinney', 'Amarillo', 'Grand Prairie', 'Brownsville', 'Killeen', 'Pasadena', 'Mesquite', 
    'McAllen', 'Denton', 'Waco', 'Carrollton', 'Midland', 'Abilene', 'Beaumont', 'Round Rock'
  ],
  Florida: [
    'Miami', 'Orlando', 'Tampa', 'Jacksonville', 'St. Petersburg', 'Hialeah', 'Tallahassee', 
    'Fort Lauderdale', 'Port St. Lucie', 'Cape Coral', 'Pembroke Pines', 'Hollywood', 
    'Miramar', 'Gainesville', 'Coral Springs', 'Clearwater', 'Palm Bay', 'Pompano Beach', 
    'West Palm Beach', 'Lakeland', 'Boca Raton', 'Sarasota', 'Bradenton', 'Naples'
  ],
  Washington: [
    'Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett', 'Renton', 
    'Spokane Valley', 'Federal Way', 'Yakima', 'Bellingham', 'Kirkland', 'Olympia', 'Redmond'
  ],
  Illinois: [
    'Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford', 'Springfield', 'Elgin', 
    'Peoria', 'Champaign', 'Waukegan', 'Cicero', 'Bloomington', 'Evanston', 'Arlington Heights'
  ],
  Massachusetts: [
    'Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton', 'Quincy', 
    'Lynn', 'New Bedford', 'Fall River', 'Newton', 'Somerville', 'Framingham', 'Waltham'
  ],
  Georgia: [
    'Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah', 'Athens', 'Sandy Springs', 
    'South Fulton', 'Roswell', 'Johns Creek', 'Warner Robins', 'Albany', 'Alpharetta', 'Marietta'
  ],
  Colorado: [
    'Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 
    'Arvada', 'Westminster', 'Pueblo', 'Greeley', 'Centennial', 'Boulder', 'Longmont'
  ],
  Pennsylvania: [
    'Philadelphia', 'Pittsburgh', 'Allentown', 'Reading', 'Erie', 'Upper Darby', 'Scranton', 
    'Bethlehem', 'Lancaster', 'Harrisburg', 'York', 'State College'
  ],
  Ohio: [
    'Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton', 'Youngstown'
  ],
  Michigan: [
    'Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing', 'Dearborn', 'Flint'
  ],
  'North Carolina': [
    'Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary', 'Wilmington'
  ],
  Oregon: [
    'Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro', 'Beaverton', 'Bend', 'Medford'
  ],
  Nevada: [
    'Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City'
  ],
  Arizona: [
    'Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Glendale', 'Gilbert', 'Tempe', 'Peoria', 'Surprise'
  ],
  Hawaii: [
    'Honolulu', 'East Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu', 'Kaneohe'
  ],
  'District of Columbia': [
    'Washington, D.C.', 'Georgetown', 'Capitol Hill', 'Dupont Circle', 'Adams Morgan', 'Navy Yard'
  ],

  // --- Indonesia (Kota, Kabupaten & Kecamatan Populer) ---
  'DKI Jakarta': [
    'Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara', 'Kepulauan Seribu',
    'Kebayoran Baru', 'Kebayoran Lama', 'Cilandak', 'Pasar Minggu', 'Jagakarsa', 'Mampang Prapatan', 
    'Pancoran', 'Tebet', 'Setiabudi', 'Pesanggrahan', 'Gambir', 'Tanah Abang', 'Menteng', 'Senen', 
    'Cempaka Putih', 'Johar Baru', 'Kemayoran', 'Sawah Besar', 'Grogol Petamburan', 'Palmerah', 
    'Kebon Jeruk', 'Kembangan', 'Taman Sari', 'Tambora', 'Cengkareng', 'Kalideres', 'Matraman', 
    'Pulo Gadung', 'Jatinegara', 'Duren Sawit', 'Kramat Jati', 'Makasar', 'Pasar Rebo', 'Ciracas', 
    'Cipayung', 'Cakung', 'Penjaringan', 'Tanjung Priok', 'Koja', 'Cilincing', 'Pademangan', 'Kelapa Gading'
  ],
  'Jawa Barat': [
    'Kota Bandung', 'Kota Bekasi', 'Kota Bogor', 'Kota Depok', 'Kota Cimahi', 'Kota Sukabumi', 
    'Kota Cirebon', 'Kota Tasikmalaya', 'Kota Banjar', 'Kabupaten Bandung', 'Kabupaten Bandung Barat', 
    'Kabupaten Bekasi (Cikarang)', 'Kabupaten Bogor (Cibinong)', 'Kabupaten Ciamis', 'Kabupaten Cianjur', 
    'Kabupaten Cirebon', 'Kabupaten Garut', 'Kabupaten Indramayu', 'Kabupaten Karawang', 
    'Kabupaten Kuningan', 'Kabupaten Majalengka', 'Kabupaten Pangandaran', 'Kabupaten Purwakarta', 
    'Kabupaten Subang', 'Kabupaten Sukabumi', 'Kabupaten Sumedang', 'Kabupaten Tasikmalaya'
  ],
  'Jawa Timur': [
    'Kota Surabaya', 'Kota Malang', 'Kota Madiun', 'Kota Kediri', 'Kota Mojokerto', 'Kota Blitar', 
    'Kota Pasuruan', 'Kota Probolinggo', 'Kota Batu', 'Kabupaten Sidoarjo', 'Kabupaten Gresik', 
    'Kabupaten Malang', 'Kabupaten Banyuwangi', 'Kabupaten Jember', 'Kabupaten Pasuruan', 
    'Kabupaten Mojokerto', 'Kabupaten Kediri', 'Kabupaten Bojonegoro', 'Kabupaten Lamongan', 
    'Kabupaten Tuban', 'Kabupaten Jombang', 'Kabupaten Nganjuk', 'Kabupaten Tulungagung', 
    'Kabupaten Blitar', 'Kabupaten Trenggalek', 'Kabupaten Ponorogo', 'Kabupaten Magetan', 'Kabupaten Ngawi'
  ],
  'Jawa Tengah': [
    'Kota Semarang', 'Kota Surakarta (Solo)', 'Kota Salatiga', 'Kota Magelang', 'Kota Pekalongan', 
    'Kota Tegal', 'Kabupaten Banyumas (Purwokerto)', 'Kabupaten Cilacap', 'Kabupaten Brebes', 
    'Kabupaten Tegal', 'Kabupaten Pemalang', 'Kabupaten Pekalongan', 'Kabupaten Batang', 
    'Kabupaten Kendal', 'Kabupaten Demak', 'Kabupaten Kudus', 'Kabupaten Jepara', 'Kabupaten Pati', 
    'Kabupaten Rembang', 'Kabupaten Blora', 'Kabupaten Grobogan', 'Kabupaten Boyolali', 
    'Kabupaten Klaten', 'Kabupaten Sukoharjo', 'Kabupaten Wonogiri', 'Kabupaten Karanganyar', 'Kabupaten Sragen'
  ],
  Banten: [
    'Kota Tangerang', 'Kota Tangerang Selatan (BSD/Serpong)', 'Kota Serang', 'Kota Cilegon', 
    'Kabupaten Tangerang', 'Kabupaten Serang', 'Kabupaten Pandeglang', 'Kabupaten Lebak', 
    'Ciputat', 'Pamulang', 'Pondok Aren (Bintaro)', 'Kelapa Dua', 'Curug', 'Cikupa', 'Balaraja'
  ],
  Bali: [
    'Kota Denpasar', 'Kabupaten Badung (Kuta, Seminyak, Canggu)', 'Kabupaten Gianyar (Ubud)', 
    'Kabupaten Tabanan', 'Kabupaten Buleleng (Singaraja)', 'Kabupaten Karangasem', 
    'Kabupaten Klungkung (Nusa Penida)', 'Kabupaten Bangli', 'Kabupaten Jembrana (Negara)'
  ],
  'DI Yogyakarta': [
    'Kota Yogyakarta', 'Kabupaten Sleman (Depok, Mlati, Ngaglik)', 'Kabupaten Bantul (Kasihan, Sewon, Banguntapan)', 
    'Kabupaten Kulon Progo (Wates)', 'Kabupaten Gunungkidul (Wonosari)', 'Malioboro', 'Kotagede'
  ],
  'Sumatera Utara': [
    'Kota Medan', 'Kota Binjai', 'Kota Pematangsiantar', 'Kota Tebing Tinggi', 'Kota Tanjungbalai', 
    'Kota Sibolga', 'Kota Padangsidimpuan', 'Kota Gunungsitoli', 'Kabupaten Deli Serdang', 'Kabupaten Karo'
  ],
  'Sumatera Barat': [
    'Kota Padang', 'Kota Bukittinggi', 'Kota Payakumbuh', 'Kota Pariaman', 'Kota Solok', 
    'Kota Padang Panjang', 'Kota Sawahlunto', 'Kabupaten Agam', 'Kabupaten Tanah Datar'
  ],
  Riau: [
    'Kota Pekanbaru', 'Kota Dumai', 'Kabupaten Kampar', 'Kabupaten Siak', 'Kabupaten Bengkalis', 
    'Kabupaten Indragiri Hulu', 'Kabupaten Indragiri Hilir', 'Kabupaten Pelalawan', 'Kabupaten Rokan Hilir'
  ],
  'Kepulauan Riau': [
    'Kota Batam', 'Kota Tanjungpinang', 'Kabupaten Bintan', 'Kabupaten Karimun', 'Kabupaten Natuna', 'Kabupaten Anambas'
  ],
  'Sulawesi Selatan': [
    'Kota Makassar', 'Kota Parepare', 'Kota Palopo', 'Kabupaten Gowa', 'Kabupaten Maros', 
    'Kabupaten Bone', 'Kabupaten Bulukumba', 'Kabupaten Bantaeng', 'Kabupaten Luwu'
  ],

  // --- Canada ---
  Ontario: ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 'Markham', 'Vaughan', 'Kitchener', 'Windsor'],
  'British Columbia': ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Abbotsford', 'Coquitlam', 'Kelowna', 'Victoria', 'Nanaimo'],
  Quebec: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke', 'Levis', 'Trois-Rivieres'],
  Alberta: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'St. Albert', 'Medicine Hat', 'Wood Buffalo (Fort McMurray)'],

  // --- United Kingdom ---
  England: ['London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Newcastle', 'Sheffield', 'Bristol', 'Nottingham', 'Southampton', 'Oxford', 'Cambridge'],
  Scotland: ['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee', 'Inverness', 'Perth', 'Stirling'],
  Wales: ['Cardiff', 'Swansea', 'Newport', 'Wrexham', 'Bangor'],
  'Northern Ireland': ['Belfast', 'Derry / Londonderry', 'Lisburn', 'Newry', 'Bangor'],
  'Greater London': ['City of London', 'Westminster', 'Kensington and Chelsea', 'Camden', 'Greenwich', 'Hackney', 'Islington', 'Lambeth', 'Southwark', 'Tower Hamlets'],

  // --- Australia ---
  'New South Wales': ['Sydney', 'Newcastle', 'Central Coast', 'Wollongong', 'Maitland', 'Tweed Heads', 'Wagga Wagga', 'Albury', 'Port Macquarie', 'Tamworth', 'Orange'],
  Victoria: ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Shepparton', 'Mildura', 'Warrnambool', 'Wodonga', 'Traralgon'],
  Queensland: ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville', 'Cairns', 'Toowoomba', 'Mackay', 'Rockhampton', 'Bundaberg', 'Hervey Bay'],
  'Western Australia': ['Perth', 'Mandurah', 'Bunbury', 'Busselton', 'Geraldton', 'Albany', 'Kalgoorlie-Boulder'],
  'South Australia': ['Adelaide', 'Mount Gambier', 'Whyalla', 'Gawler', 'Port Lincoln'],

  // --- Germany ---
  Berlin: ['Berlin (Mitte)', 'Charlottenburg', 'Pankow', 'Kreuzberg', 'Neukolln', 'Spandau'],
  Bavaria: ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg', 'Ingolstadt', 'Wurzburg', 'Furth', 'Erlangen', 'Bamberg'],
  'North Rhine-Westphalia': ['Cologne', 'Dusseldorf', 'Dortmund', 'Essen', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Munster'],
  Hamburg: ['Hamburg', 'Altona', 'Eimsbuttel', 'Hamburg-Nord', 'Wandsbek', 'Bergedorf', 'Harburg'],
  Hesse: ['Frankfurt am Main', 'Wiesbaden', 'Kassel', 'Darmstadt', 'Offenbach am Main', 'Hanau', 'Giessen'],

  // --- Singapore ---
  'Central Region': ['Downtown Core', 'Marina Bay', 'Orchard', 'Newton', 'Novena', 'Rochor', 'Queenstown', 'Bukit Merah', 'Tanglin', 'Toa Payoh'],
  'East Region': ['Bedok', 'Tampines', 'Pasir Ris', 'Changi'],
  'North Region': ['Woodlands', 'Yishun', 'Sembawang', 'Mandai'],
  'North-East Region': ['Ang Mo Kio', 'Hougang', 'Punggol', 'Sengkang', 'Serangoon'],
  'West Region': ['Jurong East', 'Jurong West', 'Clementi', 'Bukit Batok', 'Bukit Panjang', 'Choa Chu Kang', 'Tuas']
};

/**
 * Returns dynamic cities, districts, or kecamatans for a selected country & state/province.
 */
export function getCitiesForState(country: string, stateProvince: string): string[] {
  if (!stateProvince) return [];
  const cleanState = stateProvince.trim();
  if (CITIES_BY_STATE[cleanState]) {
    return CITIES_BY_STATE[cleanState];
  }
  // Try case-insensitive lookup
  const stateKey = Object.keys(CITIES_BY_STATE).find(k => k.toLowerCase() === cleanState.toLowerCase());
  if (stateKey) {
    return CITIES_BY_STATE[stateKey];
  }
  return [];
}

/**
 * Auto-detect user country, dial code, and location from Cloudflare Edge Geolocation (/api/geo)
 * with robust client-side timezone & locale fallback. Zero external costs, zero delay.
 */
export async function detectClientLocation(): Promise<{
  countryCode?: string;
  countryName?: string;
  dialCode?: string;
  city?: string;
  region?: string;
  postalCode?: string;
}> {
  try {
    const res = await fetch('/api/geo');
    if (res.ok) {
      const data = await res.json() as any;
      if (data && data.country_code) {
        const found = COUNTRIES.find(c => c.code.toUpperCase() === data.country_code.toUpperCase());
        if (found) {
          return {
            countryCode: found.code,
            countryName: found.name,
            dialCode: found.dial,
            city: data.city || undefined,
            region: data.region || undefined,
            postalCode: data.postal_code || undefined
          };
        }
      }
    }
  } catch (_) {}

  // Fallback to client browser timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('America/')) {
      const us = COUNTRIES.find(c => c.code === 'US');
      return { countryCode: 'US', countryName: us?.name || 'United States', dialCode: us?.dial || '+1' };
    }
    if (tz.startsWith('Asia/Jakarta') || tz.startsWith('Asia/Pontianak') || tz.startsWith('Asia/Makassar') || tz.startsWith('Asia/Jayapura')) {
      const id = COUNTRIES.find(c => c.code === 'ID');
      return { countryCode: 'ID', countryName: id?.name || 'Indonesia', dialCode: id?.dial || '+62' };
    }
    if (tz.startsWith('Europe/London')) {
      const gb = COUNTRIES.find(c => c.code === 'GB');
      return { countryCode: 'GB', countryName: gb?.name || 'United Kingdom', dialCode: gb?.dial || '+44' };
    }
    if (tz.startsWith('Australia/')) {
      const au = COUNTRIES.find(c => c.code === 'AU');
      return { countryCode: 'AU', countryName: au?.name || 'Australia', dialCode: au?.dial || '+61' };
    }
    if (tz.startsWith('Asia/Singapore')) {
      const sg = COUNTRIES.find(c => c.code === 'SG');
      return { countryCode: 'SG', countryName: sg?.name || 'Singapore', dialCode: sg?.dial || '+65' };
    }
  } catch (_) {}

  // Default to US
  return { countryCode: 'US', countryName: 'United States', dialCode: '+1' };
}

export function findCountryByName(name: string): CountryOption | undefined {
  if (!name) return undefined;
  const lower = name.trim().toLowerCase();
  return COUNTRIES.find(c => c.name.toLowerCase() === lower || c.code.toLowerCase() === lower);
}

export function findCountryByDial(dial: string): CountryOption | undefined {
  if (!dial) return undefined;
  const cleanDial = dial.trim();
  return COUNTRIES.find(c => c.dial === cleanDial);
}

export function getDummyAffiliateData(email?: string) {
  if (email && email.toLowerCase() === 'gotrainer19@gmail.com') {
    return {
      affiliate_code: 'GOTRAINER19',
      paypal_email: 'agent@amir.subqi.com',
      phone_code: '+1',
      phone_number: '4155550198',
      country: 'United States',
      state_province: 'California',
      city: 'San Francisco',
      postal_code: '94105',
      street_address: '525 Market St, Suite 3200'
    };
  }
  return null;
}

export async function checkCouponAvailability(
  supabase: any,
  code: string,
  currentAffiliateId?: string
): Promise<{ available: boolean; message: string }> {
  if (!code || code.trim().length < 3) {
    return { available: false, message: 'Code must be at least 3 characters.' };
  }
  const cleanCode = code.trim().toUpperCase();
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('id, code, affiliate_id, is_active')
      .ilike('code', cleanCode)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return { available: false, message: 'Verification error. Please retry.' };
    }
    if (!data) {
      return { available: true, message: `"${cleanCode}" is available to use!` };
    }
    if (currentAffiliateId && data.affiliate_id === currentAffiliateId) {
      return { available: true, message: `"${cleanCode}" is currently assigned to your account.` };
    }
    return { available: false, message: `"${cleanCode}" is already taken by another partner or campaign.` };
  } catch (err: any) {
    return { available: false, message: err.message || 'Verification failed.' };
  }
}

export async function syncAffiliateCoupon(
  supabase: any, 
  affiliateId: string, 
  affiliateCode: string,
  customCode?: string,
  discountPercent: number = 10
) {
  if (!affiliateId || !affiliateCode) return null;
  const clampedDiscount = Math.min(30, Math.max(10, Math.round(discountPercent || 10)));
  const finalCode = (customCode || `${affiliateCode.trim().toUpperCase()}${clampedDiscount}`).trim().toUpperCase();
  const today = new Date().toISOString().split('T')[0];
  // Auto-expire after 1 year (365 days) to keep database clean
  const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const { data: existing } = await supabase
      .from('coupons')
      .select('id, code, affiliate_id')
      .eq('code', finalCode)
      .maybeSingle();

    if (existing) {
      if (existing.affiliate_id && existing.affiliate_id !== affiliateId) {
        throw new Error(`Coupon code "${finalCode}" is already registered to another partner.`);
      }
      await supabase
        .from('coupons')
        .update({
          affiliate_id: affiliateId,
          discount_percentage: clampedDiscount,
          discount_value: clampedDiscount,
          discount_type: 'percentage',
          start_date: today,
          end_date: oneYearLater,
          is_active: true
        })
        .eq('id', existing.id);
      return finalCode;
    } else {
      await supabase
        .from('coupons')
        .insert({
          code: finalCode,
          discount_percentage: clampedDiscount,
          discount_value: clampedDiscount,
          discount_type: 'percentage',
          is_active: true,
          affiliate_id: affiliateId,
          start_date: today,
          end_date: oneYearLater,
          max_uses: null
        });
      return finalCode;
    }
  } catch (err) {
    console.error('Failed to sync affiliate coupon:', err);
    throw err;
  }
}

export const AFFILIATE_MIN_PAYOUT_USD = 50.00;

export function getNextMonthlyPayoutDate(): { dateString: string; daysLeft: number; payoutDate: Date } {
  const now = new Date();
  const nextPayout = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  const diffTime = nextPayout.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const dateString = nextPayout.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return { dateString, daysLeft, payoutDate: nextPayout };
}
