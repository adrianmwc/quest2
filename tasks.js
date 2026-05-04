const allTasks = [
    {
        id: "1",
        title: "Station 1 - \nThe Old Fountain",
        location: "Central Plaza",
        desc: "Find the bronze plaque. What is the last word? \n\nFrogs are carnivorous, cold-blooded amphibians known for their smooth skin, long hind legs designed for leaping, and a three-stage metamorphosis from aquatic, gill-breathing tadpoles to land-dwelling, lung-breathing adults. \n\nBelonging to the order Anura, over 7,000 species exist worldwide, thriving in moist environments where they breathe through lungs and specialized, permeable skin. \n\nAnswer is WATER",
        img: "01-fountain.jpg",
        code: "WATER",
        pts: 100,
        hint: "Starts with W"
    },
    {
        id: "2",
        title: "Station 2 - \nStatue Park",
        location: "Foyer",
        desc: "What year is on the base? \n\nAnswer is 1892",
        img: "02-statue.jpg",
        code: "1892",
        pts: 150,
        hint: "Late 19th century."
    },
    {
        id: "3",
        title: "Station 3 - \nThe Grand Pillars",
        location: "Main Entrance",
        desc: "Count the total number of white pillars on the front of the Library building. \n\nAnswer is 12",
        code: "12",
        pts: 200,
        img: "03-library.jpg",
        hint: "It's an even number between 10 and 15."
    },
    {
        id: "4",
        title: "Station 4 - \nLibrary Secret",
        location: "Main Library",
        desc: "Locate the bust of the founder. What is the middle name? \n\nAnswer is ALEX",
        img: "04-bust.jpg",
        code: "ALEX",
        pts: 250,
        hint: "The statue is on the second floor near the archives."
    },
    {
        id: "5",
        title: "Station 5 - \nThe Sundial",
        location: "Garden East",
        desc: "Identify the Roman numeral for the number 4 on the dial. \n\nAnswer is IV",
        img: "05-garden.jpg",
        code: "IV",
        pts: 100,
        hint: "I and V."
    },
    {
        id: "6",
        title: "Station 6 - \nBronze Bench",
        location: "North Path",
        desc: "Who is the bench dedicated to? (Last Name) \n\nAnswer is MILLER",
        img: "06-bench.jpg",
        code: "MILLER",
        pts: 150,
        hint: "Check the metal strip on the backrest."
    },
    {
        id: "7",
        title: "Station 7 - \nClock Tower",
        location: "Heritage Square",
        desc: "How many small windows are on the north face of the tower? \n\nAnswer is 3",
        img: "07-clock.jpg",
        code: "3",
        pts: 200,
        hint: "Look way up near the clock face."
    },
    {
        id: "8",
        title: "Station 8 - \nIron Gates",
        location: "West Entrance",
        desc: "What animal is depicted at the top of the ironwork? \n\nAnswer is LION",
        img: "08-gates.jpg",
        code: "LION",
        pts: 150,
        hint: "The king of the jungle."
    },
    {
        id: "9",
        title: "Station 9 - \nMemorial Tree",
        location: "The Arboretum",
        desc: "What type of tree was planted in 1995? \n\nAnswer is OAK",
        img: "09-tree.jpg",
        code: "OAK",
        pts: 100,
        hint: "Produces acorns."
    },
    {
        id: "10",
        title: "Station 10 - \nScience Hall",
        location: "Lab Wing",
        desc: "What is the element name on room 302? \n\nAnswer is HELIUM",
        img: "10-science.jpg",
        code: "HELIUM",
        pts: 250,
        hint: "He on the periodic table."
    },
    {
        id: "11",
        title: "Station 11 - \nThe Amphitheater",
        location: "Student Green",
        desc: "How many concrete steps lead to the stage? \n\nAnswer is 8",
        img: "11-stage.jpg",
        code: "8",
        pts: 150,
        hint: "A number between 5 and 10."
    },
    {
        id: "12",
        title: "Station 12 - \nArt Gallery",
        location: "East Wing",
        desc: "What color is the front door of the gallery? \n\nAnswer is RED",
        img: "12-gallery.jpg",
        code: "RED",
        pts: 100,
        hint: "Think of a fire truck."
    },
    {
        id: "13",
        title: "Station 13 - \nThe Bell",
        location: "History Plaza",
        desc: "What is the inscription year on the hanging bell? \n\nAnswer is 1855",
        img: "13-bell.jpg",
        code: "1855",
        pts: 200,
        hint: "Mid-19th century."
    },
    {
        id: "14",
        title: "Station 14 - \nSports Center",
        location: "Athletic Field",
        desc: "How many flagpoles are outside the main gym? \n\nAnswer is 5",
        img: "14-gym.jpg",
        code: "5",
        pts: 150,
        hint: "Count them from left to right."
    },
    {
        id: "15",
        title: "Station 15 - \nBotanical Plaque",
        location: "Greenhouse",
        desc: "Which family do the lilies belong to? \n\nAnswer is LILIACEAE",
        img: "15-plants.jpg",
        code: "LILIACEAE",
        pts: 300,
        hint: "Scientific name on the small green sign."
    },
    {
        id: "16",
        title: "Station 16 - \nThe Archway",
        location: "Campus Gate",
        desc: "What is the motto written above the arch? \n\nAnswer is TRUTH",
        img: "16-arch.jpg",
        code: "TRUTH",
        pts: 200,
        hint: "The opposite of a lie."
    },
    {
        id: "17",
        title: "Station 17 - \nPond Overlook",
        location: "Wetlands",
        desc: "How many wooden planks make up the viewing bench? \n\nAnswer is 6",
        img: "17-pond.jpg",
        code: "6",
        pts: 150,
        hint: "Half a dozen."
    },
    {
        id: "18",
        title: "Station 18 - \nFaculty Mural",
        location: "Admin Building",
        desc: "What is the primary fruit shown in the mural? \n\nAnswer is APPLE",
        img: "18-mural.jpg",
        code: "APPLE",
        pts: 100,
        hint: "Associated with teachers."
    },
    {
        id: "19",
        title: "Station 19 - \nHidden Well",
        location: "Old Campus",
        desc: "What is the diameter of the well cover in inches? \n\nAnswer is 24",
        img: "19-well.jpg",
        code: "24",
        pts: 250,
        hint: "Two feet."
    },
    {
        id: "20",
        title: "Station 20 - \nMission Finale",
        location: "Grand Hall",
        desc: "What is the floor pattern color in the center? \n\nAnswer is GOLD",
        img: "20-hall.jpg",
        code: "GOLD",
        pts: 500,
        hint: "A shiny precious metal."
    }
];