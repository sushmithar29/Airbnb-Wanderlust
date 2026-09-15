const listings = require('../models/listings.js');

module.exports.index= async (req, res) => {
    const allListings = await Listing.find({});
    res.render('listings/index', { allListings });
};

module.exports.renderNewForm =(req, res) => {
    res.render('listings/new.ejs');
};

module.exports.showListing = (async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
    .populate({path: 'reviews', populate: { path: 'author' }})
    .populate('owner');

    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }
    console.log(listing);
    res.render('listings/show.ejs', { listing });
});

module.exports.createListing = (async (req, res) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    await newListing.save();
    req.flash('success', 'Successfully created a new listing!');
    res.redirect('/listings');
});

module.exports.renderEditForm = (async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
    .populate('reviews')
    .populate('owner');
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }

   let originalImageUrl= listings.image.url;
   originalImageUrl=originalImageUrl.replace("/upload","/upload/h_300,w_250");
    res.render('listings/edit.ejs', { listing, originalImageUrl });
});

module.exports.updateListings=(async (req, res) => {
    let { id } = req.params;
    let listing=await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    if(typeof req.file!=="undefined")
    {
    let url=req.file.path;
    let filename=req.file.filename;
    listing.image={ url,filename };
    await listing.save()
    }

    req.flash('success', 'Successfully updated the listing!');
    res.redirect(`/listings/${id}`);
});