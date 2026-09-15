export type IntakeTier = 'required' | 'recommended' | 'premium';
export type IntakeKind = 'brand' | 'copy' | 'image' | 'video' | '3d' | 'audio' | 'data' | 'document' | 'font' | 'integration' | 'legal';

export interface IntakeRequirement {
  id: string;
  group: string;
  label: string;
  description: string;
  tier: IntakeTier;
  kind: IntakeKind;
  accept: string[];
  preferred?: string;
  minimum?: string;
  unlocks: string[];
}

export interface IntakeProfile {
  id: string;
  label: string;
  short: string;
  outcome: string;
  items: IntakeRequirement[];
}

const item = (
  id: string, group: string, label: string, description: string, tier: IntakeTier, kind: IntakeKind,
  accept: string[], unlocks: string[], preferred?: string, minimum?: string,
): IntakeRequirement => ({ id, group, label, description, tier, kind, accept, preferred, minimum, unlocks });

export const universalRequirements: IntakeRequirement[] = [
  item('brand-logo-system','Brand','Logo system','Primary, alternate, stacked and symbol-only marks.','required','brand',['svg','ai','eps','pdf'],['Brand-accurate navigation','High-resolution motion lockups'],'SVG plus original vector source'),
  item('brand-guidelines','Brand','Brand guidelines','Current rules for logo, color, typography, imagery and voice.','required','document',['pdf','fig'],['Consistent visual direction','Faster approvals'],'Current approved brand book'),
  item('brand-colors','Brand','Color specifications','Approved HEX/RGB plus print references where relevant.','required','data',['json','csv','txt','pdf'],['Accurate UI tokens','Material and lighting art direction'],'HEX/RGB/Pantone schedule'),
  item('brand-fonts','Brand','Licensed web fonts','Actual font files and proof of web usage rights.','required','font',['woff2','woff','otf','ttf','pdf'],['Brand-accurate typography','Stable loading and responsive type'],'WOFF2 variable files plus license'),
  item('brand-graphics','Brand','Graphic system','Icons, patterns, illustrations, textures, motifs and existing design tokens.','recommended','brand',['svg','ai','eps','fig','psd','png'],['Distinctive transitions','Ownable page composition'],'Editable vector/source files'),
  item('copy-messaging','Content','Messaging and voice','Approved positioning, manifesto, hero statements and tone guidance.','required','copy',['docx','pdf','md','txt','json'],['Narrative structure','High-confidence headlines'],'Structured copy deck'),
  item('copy-legal','Content','Legal and policy copy','Copyright, disclaimers, privacy, terms and regulated copy supplied by the client.','required','legal',['docx','pdf','md','txt'],['Production-safe publishing','Footer and disclosure systems'],'Approved final wording'),
  item('proof','Proof','Trust assets','Testimonials, awards, press, partner/customer logos and measurable proof.','recommended','document',['svg','pdf','docx','csv','jpg','png'],['Case-study credibility','Conversion sections'],'SVG logos plus verified copy'),
  item('references','Direction','Reference set','Three to ten reference URLs plus notes on exactly what the brand likes and dislikes.','required','copy',['txt','md','json','pdf'],['Reference-driven scope','Better shot and interaction planning'],'Annotated references, not links alone'),
  item('rights','Rights','Asset rights confirmation','Ownership or license confirmation for photography, video, fonts, audio, 3D and supplied campaign work.','required','legal',['pdf','docx','txt','eml'],['Rights-cleared delivery','Reduced launch risk'],'Written confirmation from rights holder'),
];

const profiles: IntakeProfile[] = [
  {
    id:'creative-studio', label:'Creative studio / agency / portfolio', short:'Noth.in-style studio, portfolio and case-study experiences.',
    outcome:'A highly art-directed portfolio with a signature hero system, project storytelling, motion identity and premium studio presentation.',
    items:[
      item('studio-signature-objects','Signature system','Signature visual object set','A coherent set of isolated CGI, scanned, photographed or illustrated objects used as the site’s recognizable visual language.','required','image',['png','webp','tif','psd','blend','glb'],['Ownable hero composition','Object-led transitions','Noth.in-style art direction'],'10–20 transparent or source objects','2500 px+ long edge for raster'),
      item('studio-projects','Case studies','Portfolio project package','For at least five strong projects: title, client, year, services, summary, outcomes, credits and rights.','required','copy',['json','csv','docx','md','pdf'],['Project index','Case-study narrative','Filtering'],'Structured JSON/CSV plus copy deck'),
      item('studio-project-media','Case studies','Project image library','Five to fifteen high-resolution images per selected project.','required','image',['jpg','jpeg','png','tif','webp','avif'],['Editorial grids','Scroll reveals','Project detail pages'],'Original uncropped masters','4000 px preferred'),
      item('studio-project-motion','Case studies','Project motion assets','Films, loops, title sequences, motion tests and campaign excerpts.','recommended','video',['mov','mp4','webm'],['Cinematic project transitions','Motion-led case studies'],'ProRes masters where available','1080p minimum; 4K preferred'),
      item('studio-team','Studio','Team and studio content','Team roster, roles, bios, founders, locations, services and studio imagery.','recommended','document',['json','csv','docx','jpg','png'],['About/studio storytelling','Contact and services sections'],'Structured roster plus high-resolution portraits'),
    ],
  },
  {
    id:'luxury-product', label:'Luxury product / launch', short:'Watch, jewelry, fragrance, eyewear, furniture, hardware and product storytelling.',
    outcome:'A cinematic product experience with believable surfaces, macro detail, configurable variants and optional exploded/assembly choreography.',
    items:[
      item('product-cad','Product geometry','Production CAD / source 3D','Original manufacturing or highest-fidelity source geometry.','required','3d',['step','stp','iges','igs','sldprt','3dm','blend','fbx','obj','glb'],['Photoreal product hero','Macro camera work','Reliable part separation'],'STEP/STP or native CAD before web optimization'),
      item('product-dimensions','Product geometry','Physical dimensions','Real dimensions, scale, weight and engineering drawings when relevant.','required','document',['pdf','dwg','dxf','csv','json'],['Correct world scale','Camera and physics credibility'],'Engineering drawing or structured dimensions'),
      item('product-materials','Materials','Material and finish schedule','Surface names, finish, metal/coating, roughness, transmission and macro references.','required','image',['jpg','png','tif','exr','json','pdf'],['Photoreal materials','Variant switching','Macro detail'],'PBR maps and physical sample references','2K–4K texture masters'),
      item('product-variants','Commerce / variants','Variant matrix','SKU, color, material, size, price/availability and material mapping.','recommended','data',['csv','json','xlsx'],['Configurator','Variant storytelling','Commerce connection'],'CSV/JSON keyed to product parts'),
      item('product-photography','Campaign','Product photography','Front, rear, side, 3/4, macro, packaging and lifestyle masters.','required','image',['jpg','tif','raw','png'],['Fallback compositions','Editorial content','Material validation'],'Original RAW/TIFF/JPEG masters','4000 px+ preferred'),
      item('product-film','Campaign','Product film and macro footage','Turntable, assembly, manufacturing, lifestyle and campaign footage.','recommended','video',['mov','mp4','mxf'],['Cinematic transitions','Hybrid video/3D sequences'],'ProRes 422/4444 master','4K preferred'),
    ],
  },
  {
    id:'architecture-real-estate', label:'Architecture / real estate', short:'LIKOVA-class property, development, architecture and interactive sales experiences.',
    outcome:'A cinematic property experience with accurate architecture, location storytelling, selectable floors/units and optional explorable 3D.',
    items:[
      item('arch-source','Architecture','Highest-fidelity architecture source','BIM/CAD/3D source rather than rendered images only.','required','3d',['rvt','ifc','3dm','skp','blend','max','fbx','obj','dwg','dxf','glb'],['Interactive building','Exterior flythrough','Real spatial composition'],'Revit/Rhino/IFC or clean source model'),
      item('arch-hierarchy','Architecture','Named floor / unit hierarchy','Floors, units, facade, glazing, landscape, pools, fixtures and context separated or identifiable.','required','data',['ifc','rvt','3dm','fbx','glb','json','csv'],['Floor selector','Unit highlighting','Interactive hotspots'],'Stable IDs such as floor_12/unit_1204'),
      item('arch-floorplans','Sales','Floor plans','Vector or CAD plans for floors and individual units.','required','document',['dwg','dxf','pdf','svg'],['Visual floor selector','Unit detail views','Downloadable plans'],'DWG or vector PDF/SVG'),
      item('arch-unit-data','Sales','Unit / availability dataset','Floor, unit, area, beds, baths, terrace, orientation, price and availability.','required','data',['csv','json','xlsx'],['Parametric selector','Filtering','Live availability'],'CSV/JSON with unique unit IDs'),
      item('arch-renders','Visualization','Architectural visualization set','Exterior, entrance, aerial, facade, interior, amenities, terrace, day and night views.','required','image',['jpg','png','tif','exr'],['High-end editorial chapters','Fallbacks','Pre-rendered hero moments'],'4K+ source renders'),
      item('arch-drone','Location','Drone and location footage','Aerial approach, skyline, neighborhood, waterfront/landscape and twilight footage where useful.','recommended','video',['mov','mp4'],['Cinematic context','Location transitions'],'4K master footage'),
      item('arch-siteplan','Location','Master/site plan and geo data','Property boundary, north, roads, amenities, neighboring context and POIs.','recommended','data',['dwg','dxf','pdf','svg','geojson','kml','json'],['Interactive master plan','Map storytelling'],'CAD/vector plan plus GeoJSON/KML where available'),
      item('arch-material-schedule','Materials','Architectural material schedule','Stone, timber, metal, glass, textile, finishes and manufacturer references.','recommended','document',['pdf','xlsx','jpg','png'],['Realistic surfaces','Material study scenes'],'Architect/interior-design finish schedule'),
      item('arch-sales-pack','Sales','Sales and legal pack','Brochure, amenities, fact sheet, agent details, disclaimers and downloadable collateral.','required','document',['pdf','docx','xlsx','csv'],['Lead generation','Download center','Accurate project claims'],'Current approved sales pack'),
    ],
  },
  {
    id:'hospitality', label:'Hospitality / hotel / resort', short:'Hotels, resorts, restaurants and destination-led properties.',
    outcome:'An editorial destination experience with rooms, amenities, food, booking, maps and optional architectural immersion.',
    items:[
      item('hotel-photo','Property','Property photography library','Exterior, lobby, room classes, food/beverage, spa, pool, amenities and destination.','required','image',['jpg','tif','raw','png'],['Room storytelling','Gallery systems','Editorial sections'],'30–100 strong original images'),
      item('hotel-film','Property','Property and destination film','Drone, property film, rooms, food, people, nighttime and surrounding destination.','recommended','video',['mov','mp4'],['Cinematic hero','Destination transitions'],'4K masters'),
      item('hotel-inventory','Inventory','Room / experience inventory','Room type, occupancy, beds, area, amenities, view, gallery, booking URL and pricing range.','required','data',['csv','json','xlsx'],['Room browser','Filtering','Booking CTAs'],'Structured inventory'),
      item('hotel-map','Location','Property / destination map','Property map, room/building locations, amenities and nearby POIs.','recommended','data',['svg','pdf','geojson','kml','gpx'],['Interactive map','Wayfinding','Destination chapters'],'Vector property map plus geo data'),
      item('hotel-booking','Booking','Booking integration details','Booking engine URL/API, conversion tracking and reservation flow requirements.','required','integration',['json','txt','pdf'],['Live booking handoff','Availability integration'],'API docs or confirmed booking URL'),
      item('hotel-food','Food and beverage','Menus and food content','Menus, dishes, chefs, ingredients, opening hours and reservation details.','recommended','document',['pdf','csv','json','jpg'],['Restaurant storytelling','Menu experiences'],'Structured menus plus food photography'),
    ],
  },
  {
    id:'automotive', label:'Automotive / mobility', short:'Vehicles, mobility products and cinematic configurators.',
    outcome:'A high-end vehicle presentation with real-time hero shots, variant configuration, specifications and optional interactive inspection.',
    items:[
      item('auto-cad','Vehicle','Production vehicle geometry','Original CAD or highest quality vehicle source.','required','3d',['step','stp','iges','catpart','3dm','fbx','obj','glb'],['Real-time vehicle hero','Detail cameras','Configurator'],'Production CAD/Alias source'),
      item('auto-parts','Vehicle','Separated vehicle components','Body, doors, glass, wheels, tires, lights, interior, seats and dashboard separated/named.','recommended','3d',['fbx','glb','blend','3dm'],['Door/light/wheel interactions','Interior transitions'],'Named hierarchy'),
      item('auto-finishes','Materials','Paint / trim material references','Manufacturer paint values, flakes, clearcoat, wheel and interior trim references.','required','image',['jpg','png','tif','json','pdf'],['Accurate configurator materials','Studio lighting validation'],'Physical sample and PBR references'),
      item('auto-variants','Variants','Vehicle option matrix','Paint, wheels, trim, interior, packages and SKU/market availability.','recommended','data',['csv','json','xlsx'],['Configurator','Market-specific variants'],'Structured option matrix'),
      item('auto-media','Campaign','Vehicle photography and motion','Studio, profile, front/rear/3/4, interior, road, driving, drone and tracking footage.','required','video',['mov','mp4','jpg','tif'],['Hybrid cinematic sequences','Editorial storytelling'],'4K motion plus high-res still masters'),
      item('auto-specs','Specifications','Vehicle specification dataset','Power, torque, range, acceleration, dimensions, storage and charging.','required','data',['csv','json','xlsx'],['Specification explorer','Comparisons'],'Approved structured spec data'),
    ],
  },
  {
    id:'fashion-beauty', label:'Fashion / luxury / beauty', short:'Campaign-led fashion, beauty, jewelry and luxury-commerce experiences.',
    outcome:'A campaign-first experience with strong editorial imagery, product detail, motion and commerce-ready structured content.',
    items:[
      item('fashion-campaign','Campaign','Campaign master set','Key visuals, portrait, landscape, vertical, editorial close-ups and behind-the-scenes imagery.','required','image',['jpg','tif','raw','png'],['Editorial art direction','Responsive campaign layouts'],'Original uncropped campaign masters'),
      item('fashion-film','Campaign','Campaign film','Master films, loops, model motion and social crops.','recommended','video',['mov','mp4'],['Full-bleed motion','Scene transitions'],'4K ProRes when available'),
      item('fashion-catalog','Catalog','Product catalog and variants','SKU, title, category, price, colors, sizes, materials, care and availability.','required','data',['csv','json','xlsx'],['Product grid','PDP','Filtering','Commerce integration'],'Structured catalog'),
      item('fashion-product-media','Catalog','Product imagery','Front, back, side, detail, worn/on-model, editorial and transparent packshot.','required','image',['jpg','tif','png','webp'],['Luxury PDPs','Lookbooks','Hover/change states'],'High-resolution masters'),
      item('fashion-swatches','Materials','Swatches and material references','Fabric, leather, cosmetic shade or finish references.','recommended','image',['jpg','png','tif','json'],['Color/material switching','Macro material storytelling'],'Physical sample photos plus named mapping'),
      item('beauty-regulatory','Claims','Beauty / wellness claims pack','Ingredients, INCI, claims, usage, clinical substantiation and approved regulatory copy where relevant.','required','legal',['pdf','docx','csv','json'],['Compliant product detail','Ingredient storytelling'],'Approved legal/regulatory source'),
    ],
  },
  {
    id:'ecommerce', label:'E-commerce / D2C', short:'Campaign storytelling plus transactional product discovery.',
    outcome:'A premium commerce experience with campaign storytelling, robust catalog discovery, variants, proof and reliable purchase handoff.',
    items:[
      item('commerce-catalog','Commerce','Product catalog export','Product IDs, SKU, title, description, price, compare price, category, tags, variants, stock, weight and dimensions.','required','data',['csv','json','xlsx'],['Product grid','PDP','Search/filter','Cart handoff'],'Shopify/API/CSV export'),
      item('commerce-media','Commerce','SKU media coverage','Hero, alternate angles, detail, lifestyle, scale/context and product video for priority SKUs.','required','image',['jpg','png','tif','mov','mp4'],['High-conversion PDP','Collection storytelling'],'Consistent high-resolution set'),
      item('commerce-platform','Commerce','Commerce platform access','Store URL, API/storefront setup, markets, currencies, inventory and shipping/returns rules.','required','integration',['json','txt','pdf'],['Live catalog','Cart/checkout','Market support'],'Shopify/store API docs and access plan'),
      item('commerce-proof','Commerce','Reviews and trust proof','Ratings, reviews, press, guarantees, certifications and return policy.','recommended','data',['csv','json','pdf','svg'],['Trust modules','Review summaries'],'Verified structured proof'),
    ],
  },
  {
    id:'saas', label:'SaaS / startup / software', short:'Product-led SaaS, app, AI and developer-tool marketing sites.',
    outcome:'A polished product story with real UI evidence, workflow demos, integrations, pricing, proof and interactive product presentation.',
    items:[
      item('saas-product-access','Product','Demo product access','A safe demo account or reproducible product environment for the team.','required','integration',['txt','pdf'],['Authentic product storytelling','Accurate workflow capture'],'Demo account/instructions; never hard-code credentials'),
      item('saas-figma','Product','Product design source','Current Figma product file, design system or component library.','recommended','document',['fig','pdf'],['Pixel-accurate product visuals','Motion reconstruction'],'Current product Figma'),
      item('saas-screens','Product','Product UI screen set','Dashboard, mobile, onboarding, workflows, settings, analytics and empty states.','required','image',['png','jpg','svg'],['Product walkthroughs','UI choreography','Device compositions'],'2x exports or source frames'),
      item('saas-recordings','Product','Clean workflow recordings','Key workflows captured cleanly with safe demo data.','recommended','video',['mov','mp4','webm'],['Product films','Interactive walkthroughs'],'Full-resolution recordings'),
      item('saas-positioning','Messaging','Product positioning','ICP, pain points, value proposition, features, differentiation, use cases and workflows.','required','document',['docx','md','pdf','json'],['Clear narrative','Feature architecture'],'Approved messaging framework'),
      item('saas-proof','Proof','Customer proof','Customer logos, testimonials, case studies and verified outcome metrics.','recommended','data',['csv','json','docx','svg'],['Proof sections','Case studies'],'Verified quotes/metrics'),
      item('saas-integrations','Integrations','Integration directory','Integration names, SVG logos, categories and descriptions.','recommended','data',['csv','json','svg'],['Integration grid','Ecosystem storytelling'],'Structured directory'),
      item('saas-security','Trust','Security/compliance pack','SOC 2, ISO, HIPAA/GDPR language, SSO/SAML and security documentation where applicable.','recommended','legal',['pdf','docx','txt'],['Enterprise trust','Security center'],'Approved claims and certificates'),
      item('saas-pricing','Commercial','Pricing structure','Tiers, price, billing cadence, features, limits and enterprise handling.','required','data',['csv','json','xlsx'],['Pricing page','Plan comparison'],'Structured pricing source'),
    ],
  },
  {
    id:'fintech', label:'Fintech / finance', short:'Financial products where trust, compliance and data accuracy are part of the visual system.',
    outcome:'A premium financial product site with defensible data, strong trust architecture, compliant claims and polished product explanation.',
    items:[
      item('fin-regulatory','Compliance','Regulatory and disclosure pack','Licenses, jurisdictions, risk notices, fee disclosures and approved compliance copy.','required','legal',['pdf','docx','txt'],['Compliant launch','Required disclosure UX'],'Current counsel-approved content'),
      item('fin-data','Data','Approved financial data','Rates, performance, fees, metrics and source/methodology.','required','data',['csv','json','xlsx'],['Live/animated charts','Performance storytelling'],'Underlying data, never chart screenshots'),
      item('fin-trust','Trust','Institutional trust pack','Banking partners, custodians, insurance, audits and certifications.','required','document',['pdf','svg','docx'],['Trust architecture','Partner proof'],'Verified source documents/logos'),
      item('fin-leadership','Trust','Leadership and governance','Leadership/board/advisor bios, credentials and headshots.','recommended','document',['json','csv','jpg','png'],['Leadership section','Institutional credibility'],'Structured bios plus high-res portraits'),
    ],
  },
  {
    id:'data-visualization', label:'Data visualization / analytics', short:'Dashboards, maps, indexes and data-led storytelling.',
    outcome:'A data-native interactive experience driven by real datasets rather than screenshot approximations.',
    items:[
      item('data-source','Data','Underlying dataset','CSV, JSON, API or database export powering every required visualization.','required','data',['csv','json','xlsx','parquet'],['Interactive charts','Filtering','Animated trends'],'Machine-readable source'),
      item('data-dictionary','Data','Data dictionary','Field name, type, unit, description, source and null rules.','required','document',['csv','json','xlsx','pdf'],['Correct labels/scales','Reliable transformations'],'Structured schema dictionary'),
      item('data-history','Data','Historical/time-series data','Timestamps, comparison periods, baseline and historical series.','recommended','data',['csv','json','xlsx'],['Timeline animation','Trend storytelling'],'Raw time series'),
      item('data-geo','Maps','Geographic data','Coordinates, GeoJSON, country/state IDs, KML or shapefiles where maps are required.','recommended','data',['geojson','json','kml','csv','zip'],['Interactive maps','Spatial filtering'],'GeoJSON preferred for web'),
      item('data-logic','Product logic','Filter and permissions rules','Default states, filters, segments, roles, refresh rate and access rules.','required','document',['json','md','pdf'],['Correct application behavior','Stateful dashboards'],'Product requirements or JSON rules'),
    ],
  },
  {
    id:'food-beverage', label:'Food / beverage', short:'Restaurants, packaged goods and culinary storytelling.',
    outcome:'A tactile food/beverage experience combining packaging, product, ingredient/process storytelling and commerce/reservation actions.',
    items:[
      item('food-packaging','Brand/product','Packaging artwork','Labels, bottle/can/carton artwork and editable packaging graphics.','required','brand',['ai','eps','pdf','svg','psd'],['Packaging renders','Ingredient/product scenes'],'Original dielines/vector artwork'),
      item('food-product','Product','Product packshots / 3D','Packshots, transparent renders, turntables or source 3D.','required','image',['png','tif','jpg','glb','fbx','blend'],['Hero product scenes','Catalog'],'Transparent high-res or source 3D'),
      item('food-data','Product','Product/nutrition data','Product name, variants, volume, nutrition, ingredients, allergens, price and stock.','required','data',['csv','json','xlsx'],['Product detail','Nutrition/ingredient UX'],'Structured approved data'),
      item('food-story','Story','Sourcing and process content','Founder story, sourcing, farms/producers, manufacturing, recipes and serving ritual.','recommended','document',['docx','md','pdf','json'],['Editorial storytelling','Process chapters'],'Approved editorial source'),
      item('food-photo','Campaign','Food and process photography','Hero dishes/products, ingredient macro, process, table scenes, chef and location.','required','image',['jpg','tif','raw'],['Sensory art direction','Editorial sections'],'High-resolution masters'),
    ],
  },
  {
    id:'music-entertainment', label:'Music / artist / entertainment', short:'Artists, records, festivals, film, culture and audio-led experiences.',
    outcome:'An expressive entertainment experience with rights-cleared visuals, audio, archival material and optional reactive or immersive systems.',
    items:[
      item('music-visuals','Visual identity','Artwork and visual archive','Album artwork, portraits, press photography, posters, stage visuals and archival imagery.','required','image',['jpg','png','tif','psd','ai','svg'],['Artist world-building','Editorial archive'],'Original high-resolution masters'),
      item('music-audio','Audio','Approved audio masters','Music previews, ambience, stingers, SFX and sonic identity with browser rights.','required','audio',['wav','aif','flac','mp3'],['Audio-led transitions','Sound-reactive scenes'],'48 kHz/24-bit WAV preferred'),
      item('music-data','Content','Discography / event data','Releases, dates, venues, ticket links, collaborators and credits.','required','data',['csv','json','xlsx'],['Discography','Tour/events','Credits'],'Structured data'),
      item('music-reactive','Audio','Reactive timing data','BPM, time signature, cue times and stems where audio-reactive motion is desired.','premium','audio',['wav','aif','csv','json'],['Beat-synced motion','Reactive shaders'],'Separated stems plus tempo/cue map'),
    ],
  },
  {
    id:'game-immersive', label:'Game / immersive world', short:'Games, fictional worlds, entertainment IP and exploratory experiences.',
    outcome:'A navigable branded world using optimized environment/character assets, interaction states, VFX and sound.',
    items:[
      item('game-world','World','Environment and prop source','Environment, architecture, landscape, props, vehicles and key objects.','required','3d',['blend','fbx','glb','obj','usd','usdz'],['Explorable world','Cinematic flythrough'],'Optimized source with clear hierarchy'),
      item('game-characters','Characters','Character package','Models, skeletons, clothing, facial shapes and textures where characters appear.','recommended','3d',['fbx','glb','blend'],['Character scenes','Animation'],'Rigged optimized models'),
      item('game-animation','Animation','Animation library','Idle, walk, run, action, cinematic and loop animations.','recommended','3d',['fbx','glb','bvh'],['Character movement','Cinematic sequences'],'Named clips'),
      item('game-vfx','VFX','Effects source','Particle sprites, smoke/fire references, shader references and VFX textures.','recommended','image',['png','exr','mov','mp4','json'],['Atmospheric VFX','Shader moments'],'Source sprites/textures and references'),
      item('game-lore','Narrative','World bible / lore','Characters, factions, timeline, terminology, story and map.','required','document',['pdf','docx','md','json'],['Coherent narrative','Hotspots','Exploration states'],'Current lore bible'),
      item('game-audio','Audio','Music / ambience / SFX','Music, ambience, UI, character, vehicle and transition sounds.','recommended','audio',['wav','aif','flac'],['Immersive soundscape','Interaction feedback'],'Rights-cleared masters'),
    ],
  },
  {
    id:'editorial-art', label:'Editorial / art / photography / culture', short:'Museums, galleries, archives, publications and image-led cultural projects.',
    outcome:'A highly considered editorial/archive experience with accurate metadata, rights, essays and high-quality image presentation.',
    items:[
      item('art-masters','Archive','Artwork/image masters','Original/high-resolution works, photography or archive imagery.','required','image',['tif','jpg','png','raw'],['Zoomable artwork','Editorial grids','Archive browsing'],'Original masters where licensed'),
      item('art-metadata','Archive','Artwork metadata','Creator, title, year, medium, dimensions, credit, copyright, caption and tags.','required','data',['csv','json','xlsx'],['Searchable archive','Captions','Filters'],'Structured metadata keyed to filenames'),
      item('art-editorial','Editorial','Essays and interviews','Approved essays, interviews, chronology and editorial copy.','required','document',['docx','md','pdf'],['Long-form editorial','Exhibition storytelling'],'Final edited source'),
      item('art-exhibition','Exhibition','Exhibition / installation package','Installation photography, floor plans, exhibition video and artwork mapping.','recommended','document',['jpg','tif','pdf','svg','mov','mp4'],['Virtual exhibition story','Spatial context'],'High-res installation set plus plan'),
      item('art-rights','Rights','Per-asset rights metadata','Rights holder, usage period, territory and credit line for each controlled asset.','required','legal',['csv','json','xlsx','pdf'],['Rights-safe archive','Correct crediting'],'Structured rights register'),
    ],
  },
  {
    id:'travel-outdoor', label:'Travel / outdoor / destination', short:'Destinations, adventure, travel brands and itinerary-driven experiences.',
    outcome:'A cinematic destination story with routes, maps, itineraries, booking and strong environmental media.',
    items:[
      item('travel-media','Destination','Destination media library','Landscapes, accommodation, activities, food, people and seasonal imagery.','required','image',['jpg','tif','raw','mov','mp4'],['Editorial destination story','Seasonal chapters'],'High-res still and 4K motion masters'),
      item('travel-drone','Destination','Drone footage','Aerial approach, routes, topography and location context.','recommended','video',['mov','mp4'],['Cinematic geography','Route transitions'],'4K master footage'),
      item('travel-map','Maps','Route / POI map data','Routes, trails, accommodations and points of interest.','recommended','data',['gpx','kml','geojson','csv','json','svg'],['Interactive maps','Route storytelling'],'GPX/GeoJSON/KML'),
      item('travel-itinerary','Content','Itinerary dataset','Day, location, activity, duration, distance and transportation.','required','data',['csv','json','xlsx'],['Interactive itinerary','Day-by-day narrative'],'Structured itinerary'),
      item('travel-booking','Booking','Booking / availability data','Inventory, dates, prices, restrictions and booking integration.','recommended','integration',['json','csv','pdf','txt'],['Booking flow','Availability'],'API/feed or structured export'),
    ],
  },
  {
    id:'health-wellness', label:'Health / wellness', short:'Wellness, care, medical-adjacent and claims-sensitive experiences.',
    outcome:'A premium but controlled health/wellness experience using approved claims, evidence, practitioner credibility and clear safety information.',
    items:[
      item('health-product','Product','Product / treatment information','Product, packaging, ingredients, instructions and usage.','required','document',['csv','json','pdf','docx','jpg','png'],['Product/treatment storytelling','Instructions'],'Approved source materials'),
      item('health-claims','Compliance','Approved claim register','Exact approved wording, evidence source, restrictions and legal review for health claims.','required','legal',['csv','json','pdf','docx'],['Claims-safe marketing','Evidence modules'],'Counsel/regulatory-approved register'),
      item('health-evidence','Evidence','Clinical / evidence package','Study, sample size, endpoints, result, citations and limitations where claims rely on evidence.','recommended','document',['pdf','csv','json'],['Evidence visualization','Clinical proof'],'Primary/source documents'),
      item('health-practitioners','Trust','Practitioner credentials','Names, qualifications, bios, photos and licensing details where appropriate.','recommended','document',['csv','json','jpg','png','pdf'],['Provider profiles','Credibility'],'Verified credentials'),
      item('health-safety','Compliance','Warnings / contraindications','Safety warnings, contraindications and required disclaimers.','required','legal',['pdf','docx','txt'],['Safe product UX','Required disclosures'],'Approved final wording'),
    ],
  },
  {
    id:'climate-sustainability', label:'Sustainability / climate', short:'Impact, climate, circularity and evidence-led sustainability storytelling.',
    outcome:'A visually strong sustainability story whose claims, metrics and charts are backed by underlying evidence and methodology.',
    items:[
      item('climate-impact','Evidence','Impact reports and methodology','Impact/ESG reports, lifecycle methodology, sourcing and targets.','required','document',['pdf','docx','xlsx'],['Evidence-led storytelling','Impact sections'],'Current published/approved reports'),
      item('climate-data','Evidence','Underlying impact data','Carbon, energy, materials, supply chain and historical progress data.','required','data',['csv','json','xlsx'],['Interactive charts','Progress timelines'],'Raw data with units/source'),
      item('climate-cert','Evidence','Certifications','B Corp, FSC, LEED, Energy Star or other relevant verified certification assets.','recommended','legal',['pdf','svg','png'],['Verified proof','Certification UI'],'Current certificates and logos'),
      item('climate-supply','Story','Supply-chain / sourcing map','Facilities, suppliers, origins and relevant geo information.','recommended','data',['csv','json','geojson','kml'],['Supply-chain maps','Origin storytelling'],'Structured location data'),
    ],
  },
  {
    id:'corporate', label:'Corporate / professional services', short:'Enterprise, consulting, legal, investment and professional-service sites.',
    outcome:'A sophisticated corporate experience centered on capabilities, leadership, case studies and credible institutional proof.',
    items:[
      item('corp-leadership','Company','Leadership package','Headshots, bios, titles, board/advisors and credentials.','required','document',['csv','json','docx','jpg','png'],['Leadership pages','Governance story'],'Structured roster plus high-res headshots'),
      item('corp-capabilities','Company','Capabilities / business units','Services, business units, locations, history and company timeline.','required','document',['docx','md','pdf','json'],['Capability architecture','Company story'],'Approved structured content'),
      item('corp-cases','Proof','Case-study package','Client, problem, work, outcome, verified evidence and rights.','recommended','document',['json','csv','docx','pdf','jpg'],['Case-study system','Outcome proof'],'Five+ strongest cases'),
      item('corp-reports','Documents','Reports and publications','Annual reports, ESG, white papers, capabilities decks and research.','recommended','document',['pdf','docx'],['Resource center','Thought leadership'],'Current approved documents'),
    ],
  },
  {
    id:'education-docs', label:'Education / productivity / documentation', short:'Learning products, docs platforms, productivity tools and developer education.',
    outcome:'A structured learning/documentation experience with real product evidence, curriculum or technical content and source-backed diagrams.',
    items:[
      item('edu-product','Product','Product UI / workflow evidence','UI screens, workflows, demo access and recordings where the product is part of the story.','recommended','image',['png','svg','mov','mp4','fig'],['Product walkthroughs','Feature storytelling'],'Current source screens'),
      item('edu-curriculum','Learning','Curriculum / content model','Modules, lessons, learning outcomes, samples and educator information.','required','data',['csv','json','md','docx'],['Course browser','Learning path'],'Structured curriculum'),
      item('edu-docs','Documentation','Docs / API source','Markdown/MDX, API references, SDKs, code snippets, versioning and changelog.','recommended','document',['md','mdx','json','yaml','txt'],['Searchable docs','Developer portal'],'Source repository/export'),
      item('edu-diagrams','Documentation','Diagram source','Architecture, process and technical diagrams in editable/source form.','recommended','brand',['svg','fig','mmd','json'],['Animated diagrams','Responsive technical visuals'],'SVG/Figma/Mermaid instead of screenshots'),
    ],
  },
];

export const intakeProfiles = profiles;

export const intakeModules: IntakeProfile[] = [
  { id:'module-3d', label:'Interactive 3D', short:'Add a real-time 3D hero, object or environment.', outcome:'Real-time WebGL interaction and authored camera movement.', items:[
    item('mod-3d-source','3D module','Source 3D geometry','Highest-fidelity editable source geometry.','required','3d',['step','stp','iges','3dm','blend','fbx','obj','glb','rvt','ifc','skp'],['Real-time 3D scene'],'Native/source file'),
    item('mod-3d-materials','3D module','PBR material source','Base color, roughness, metallic, normal, height/AO/transmission as applicable.','required','image',['png','tif','exr','jpg'],['Believable surface response'],'2K–4K maps'),
    item('mod-3d-reference','3D module','Approved key views / lighting reference','Reference stills for desired framing, material finish and lighting.','required','image',['jpg','png','pdf'],['Targetable visual outcome'],'Five+ approved key views'),
  ]},
  { id:'module-assembly', label:'Exploded / assembly animation', short:'Separate, reveal and reassemble product or spatial parts.', outcome:'Reversible component animation with named parts.', items:[
    item('mod-assembly-parts','Assembly module','Separated named parts','Every animated component must be a distinct named node/mesh.','required','3d',['glb','fbx','blend','step'],['Exploded view','Assembly choreography'],'Named hierarchy'),
    item('mod-assembly-order','Assembly module','Assembly sequence reference','Assembly order, mechanical relationships, pivots and constraints.','required','document',['pdf','json','csv','mp4'],['Physically credible choreography'],'Engineering/exploded reference'),
  ]},
  { id:'module-motion', label:'Advanced motion identity', short:'Custom transitions, title motion and campaign choreography.', outcome:'A motion language tied to the brand rather than generic preset animation.', items:[
    item('mod-motion-guide','Motion module','Motion references / guidelines','Existing motion identity, references, title animation and transition intent.','required','video',['mov','mp4','gif','pdf'],['Brand-specific motion system'],'Annotated references or motion guide'),
    item('mod-motion-source','Motion module','Editable motion source','After Effects, Rive, Lottie or source project where existing motion must be reused.','recommended','document',['aep','riv','json','lottie'],['Accurate reuse of existing motion'],'Editable source'),
  ]},
  { id:'module-audio', label:'Audio / sonic layer', short:'Sound design, ambience and sonic identity.', outcome:'Rights-cleared audio that responds to cinematic and interactive states.', items:[
    item('mod-audio-master','Audio module','Audio masters','Music, ambience, SFX and sonic brand elements.','required','audio',['wav','aif','flac'],['Cinematic soundscape','Interaction feedback'],'48 kHz/24-bit WAV'),
    item('mod-audio-rights','Audio module','Audio usage rights','Browser/web usage rights, territory and term.','required','legal',['pdf','docx','txt','eml'],['Rights-cleared playback'],'Written license/approval'),
  ]},
  { id:'module-live-data', label:'Live data / API', short:'Live inventory, metrics, feeds or personalized data.', outcome:'A website whose data can update without rebuilding static content.', items:[
    item('mod-api-docs','Data module','API documentation and example responses','Endpoints, auth method, schema, refresh rate and rate limits.','required','integration',['json','yaml','pdf','txt'],['Live data integration'],'OpenAPI/JSON docs preferred'),
    item('mod-api-fallback','Data module','Fallback behavior','Rules for stale/missing data and approved fallback content.','required','document',['md','json','pdf'],['Graceful degradation'],'Explicit product decision'),
  ]},
  { id:'module-commerce', label:'Commerce', short:'Products, variants, inventory and checkout.', outcome:'Transactional product discovery with live or synchronized commerce data.', items:[
    item('mod-commerce-access','Commerce module','Commerce platform integration','Shop/store details, storefront API plan, markets/currencies and checkout flow.','required','integration',['json','pdf','txt'],['Catalog sync','Checkout handoff'],'Shopify/storefront details'),
  ]},
  { id:'module-cms', label:'CMS / editorial', short:'Client-editable content and publishing workflows.', outcome:'Structured content that non-developers can update safely.', items:[
    item('mod-cms-model','CMS module','CMS content model and access plan','Current CMS, fields, roles, migration source and publishing process.','required','integration',['json','csv','pdf','txt'],['CMS-driven content','Migration plan'],'Content model/export'),
  ]},
  { id:'module-localization', label:'International / localization', short:'Multiple languages, currencies and locale-aware content.', outcome:'Localized experience with correct type coverage and market-specific content.', items:[
    item('mod-locales','Localization','Locale matrix','Languages, markets, currencies, alternate logos and locale/date rules.','required','data',['csv','json','xlsx'],['Localized routes','Market-specific content'],'Structured locale matrix'),
    item('mod-translations','Localization','Approved translations','Production translations for every required content field.','required','document',['csv','json','xlsx','docx'],['Localized launch'],'Professional/approved translations'),
  ]},
  { id:'module-accessibility', label:'Accessibility / graceful fallback', short:'Reduced motion, captions, transcripts and non-WebGL fallback assets.', outcome:'A cinematic experience that remains usable when motion or WebGL is unavailable.', items:[
    item('mod-fallback-stills','Accessibility','Fallback stills','Approved still image for every critical 3D/cinematic state.','required','image',['jpg','png','webp'],['WebGL fallback','Reduced-motion story'],'Desktop/mobile approved key frames'),
    item('mod-captions','Accessibility','Captions / transcripts','Captions, transcripts and text equivalents for meaningful audio/video.','required','document',['vtt','srt','txt','docx'],['Accessible media'],'Timed captions plus transcript'),
  ]},
];

export const ambitionLevels = [
  { id:'editorial', label:'Editorial', description:'Premium typography, imagery and restrained motion.', tiers:['required'] as IntakeTier[] },
  { id:'motion', label:'Motion-rich', description:'Editorial foundation plus richer motion and campaign media.', tiers:['required','recommended'] as IntakeTier[] },
  { id:'immersive', label:'Immersive', description:'Full required/recommended intake plus premium source material where relevant.', tiers:['required','recommended','premium'] as IntakeTier[] },
] as const;

export function requirementsFor(profileId: string, moduleIds: string[], ambitionId: string): IntakeRequirement[] {
  const profile = intakeProfiles.find((entry) => entry.id === profileId) ?? intakeProfiles[0];
  const level = ambitionLevels.find((entry) => entry.id === ambitionId) ?? ambitionLevels[1];
  const all = [...universalRequirements, ...profile.items, ...intakeModules.filter((entry) => moduleIds.includes(entry.id)).flatMap((entry) => entry.items)];
  const seen = new Set<string>();
  return all.filter((entry) => level.tiers.includes(entry.tier) && !seen.has(entry.id) && seen.add(entry.id));
}
