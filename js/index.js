var S = {
    handlers: {},
    fn: {},
    utils: {},
    storage: {},
    ui: {},
    SOURCE: window.location.href.indexOf('localhost')>=0 ? 'localhost' : (window.location.href.indexOf('github')>=0 ? 'github' : ''),
    store: function() {},
    data: {
        CURRENT_TRACKS: {},
        CURRENT_PLAYLIST: null
    },
    DATA: {},
    timeouts: {
        refreshTimeout: null,
        searchTimeout: null
    },
    FUNCTIONS_URL: 'https://us-central1-spleditor-6983c.cloudfunctions.net/'
};

S.utils = {
    getUrlParameter: function(name) {
                        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
                        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
                        var results = regex.exec(location.search);
                        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    },
    cleanUrl: function(){
        var uri = window.location.toString();
        if (uri.indexOf("?") > 0) {
            var clean_uri = uri.substring(0, uri.indexOf("?"));
            window.history.pushState({}, document.title, clean_uri);
        }
    }
}

S.storage = {
    get: function(key){
        var v = sessionStorage.getItem(key);
        return v ? JSON.parse(v) : v;
    },
    set: function(key, value){
        sessionStorage.setItem(key, JSON.stringify(value));
    }
}

S.ui = {
    loggingIn: function(p){
        if(p) $('body').addClass('logging-in');
        else $('body').removeClass('logging-in');
    },
    init: function(){
        spotifyApi.getMe({}, function(err, user){ 
            S.ui.loggingIn(false);
            S.store('user', user); 
        });
        S.fn.getPlaylists(0);
    },
    user: function(){
        var u = S.store('user');
        if(u.id){
            $('body').addClass('user-logged-on');
            $('#userName').text(u.display_name);
            $('#userLink').attr('href', u.external_urls.spotify);
            $('#user').css('background-image', 'url('+u.images[0].url+')')
        } else {
            $('body').removeClass('user-logged-on');
        }
    },
    playlists: function(){
        var $playlists = $('#playlists');
        $playlists.empty();
        var $template = $('.templates .playlist-item-template');
        var playlists = S.store('playlists');
        var user = S.store('user');
        if(playlists && playlists.items && playlists.items.length && user){
            for(var i=0; i<playlists.items.length; i++){
                var p = playlists.items[i];
                if(p.owner && p.owner.id===user.id){
                    var $p = $template.clone()
                    $p.find('.playlist-title').text(p.name);
                    if(p.images && p.images.length>0){
                        $p.find('.playlist-cover').css('background-image', 'url('+p.images[0].url+')');
                    } else {
                        //$p.find('.playlist-cover').html('<i class="far fa-play-circle"></i>')
                        $p.find('.playlist-cover').css('border', '1px dashed #828282');
                    }
                    $p.attr('id', 'playlist_' + p.id).attr('data-playlist', p.id).attr('data-index', i);
                    S.handlers.playlistClick($p, p.id, i);
                    $playlists.append($p);
                }
            }
            var $p = $template.clone()
            $p.find('.playlist-title').text('[new playlist...]');
            $p.find('.playlist-cover').html('<i class="fas fa-plus-circle"></i>')
            $p.attr('id', 'playlist_' + 'new').attr('data-playlist', 'new');
            S.handlers.playlistClick($p, 'new', -1);
            $playlists.append($p);
        }
    },
    tracks: function(){
        var $tracks = $('#playlist .tracks').empty();
        var $template = $('.templates .track-template');
        var tracks = S.store('tracks');
        if(tracks && tracks.items){
            for(var i=0; i<tracks.items.length; i++){
                var t = tracks.items[i];
                var $t = $template.clone();
                $t.find('.track-title span').text(t.track.name);
                $t.attr('id', 'track_'+t.track.id);
                S.data.CURRENT_TRACKS[t.track.id] = true;
                if(t.track.album) $t.find('.track-album').text(t.track.album.name);
                if(t.track.artists.length) $t.find('.track-artist').text(t.track.artists[0].name);
                S.handlers.trackMouseout($t, 'Remove');
                S.handlers.trackClick($t, 'Remove');
                S.handlers.playClick($t, $t.find('.play'), t.track);
                S.handlers.pauseClick($t, $t.find('.pause'), t.track);
                S.handlers.removeTrackClick($t, $t.find('.removeTrack'), t.track, i);
                $tracks.append($t);
            }
            $('.playlist-counter').text(tracks.items.length);
        }
    },
    search: function(){
        var $result = $('#playlist .search-result').empty();
        var $template = $('.templates .search-template');
        var search = S.store('search');
        if(search && search.items){
            for(var i=0; i<search.items.length; i++){
                var t = search.items[i];
                var $t = $template.clone();
                $t.find('.track-title span').text(t.name);
                $t.attr('id', 'search_'+t.id);
                $t.css('background-image','url('+t.album.images[t.album.images.length-1].url+')');
                if(S.data.CURRENT_TRACKS[t.id]){
                    $t.addClass('added');
                }
                if(t.album) $t.find('.track-album').text(t.album.name);
                if(t.artists.length) $t.find('.track-artist').text(t.artists[0].name);
                S.handlers.trackMouseout($t, 'Add');
                S.handlers.trackClick($t, 'Add');
                S.handlers.playClick($t, $t.find('.play'), t);
                S.handlers.pauseClick($t, $t.find('.pause'), t);
                S.handlers.addTrackClick($t, $t.find('.addTrack'), t);
                S.handlers.addToOthersClick($t, $t.find('.addToOthers'), t);
                $result.append($t);
            }
        }
    },
    openPlaylist: function(id, index){
        $('#playlists').hide();
        $('#playlist').empty();
        var $template = $('.templates .playlist-detail-template');
        var p = index>=0 ? S.store('playlists').items[index] : { id: 'new', name: '', images: [{url:''}], tracks: { total:0 }};
        var $p = $template.clone();
        $p.find('.playlist-title').text(p.name);
        //$p.find('.playlist-description').text(p.description);
        if(p.images && p.images.length>0){
            $p.find('.playlist-cover').css('background-image', 'url('+p.images[0].url+')');
        } else {
            //$p.find('.playlist-cover').html('<i class="far fa-play-circle"></i>')
            $p.find('.playlist-cover').css('border', '1px dashed #828282');
        }
        if(p.tracks){
            $p.find('.playlist-counter').text(p.tracks.total)
        }
        $p.attr('id', 'playlist_' + p.id);

        $('#playlist').append($p);
        $('#playlist').show();
        S.data.CURRENT_PLAYLIST = p.id;
        S.data.CURRENT_TRACKS = {};
        S.fn.getPlaylistTracks(S.store('user').id, p.id, 0);


        S.handlers.backClick($p.find('.back'));
        S.handlers.searchChange($p, $p.find('.search-form input'))


        if(p.id==='new') {
            S.handlers.newPlaylistSubmit($p.find('form.new-playlist-form'));
        }
    },
    showOtherPlaylists: function($e, track){
        if($e.find('.addtoothers-template').length===0){
            var $template = $('.templates .addtoothers-template');
            var $list = $template.clone();
            var $itemtemplate = $('.templates .addtoplaylist-template');
            var playlists = S.store('playlists');
            var user = S.store('user');
            for(var i=0; i<playlists.items.length; i++){
                var p = playlists.items[i];
                if(p.owner && p.owner.id===user.id){
                    var $p = $itemtemplate.clone();
                    $p.find('.playlist-title').text(p.name);
                    S.handlers.addToOtherClick($p, $p.find('.addToOther'), p, track);
                    $list.append($p);
                }
            }
            $e.append($list);
        }
    }
}

S.store = function(key, value){
    if(value===undefined){
        return S.DATA[key];
    } else {
        S.DATA[key] = value;
        console.log(S.DATA);
        S.ui[key]();
    }
}





S.fn = {
    login: function(accessToken){
        accessToken.timestamp = new Date().getTime();
        S.storage.set('accessToken', accessToken);
        spotifyApi.setAccessToken(accessToken.access_token);
        S.timeouts.refreshTimeout = setTimeout(function(){ S.fn.refreshToken(); }, 20*60000);
    },
    refreshToken: function(){
        var accessToken = S.storage.get('accessToken');
        if(accessToken && accessToken.refresh_token){
            $.post(S.FUNCTIONS_URL + 'refreshAccessToken',
                { access_token: accessToken.access_token, refresh_token: accessToken.refresh_token, from: S.SOURCE },
                function(response){
                    if(!response.refresh_token) response.refresh_token = accessToken.refresh_token;
                    S.fn.login(response);
                });
        }
    },
    getPlaylists: function(offset){
        spotifyApi.getUserPlaylists({ limit: 50, offset: offset },
            function(err, data){
                if(offset==0) S.store('playlists', { items: [], total: 0 });
                var stored = S.store('playlists').items;
                data.items = stored.concat(data.items);
                S.store('playlists', data);
                if(data.total>offset) S.fn.getPlaylists(offset + 50);
            });
    },
    createPlaylist: function(name, isPublic, description, callback){
        spotifyApi.createPlaylist(S.store('user').id, { name: name, public: isPublic, description: description }, callback);
    },
    getPlaylistTracks: function(user, pid, offset){
        spotifyApi.getPlaylistTracks(user, pid, { limit: 100, offset: offset },
            function(err, data){
                if(offset==0) S.store('tracks', { items: [], total: 0 });
                var stored = S.store('tracks').items;
                data.items = stored.concat(data.items);
                S.store('tracks', data);
                if(data.total>offset) S.fn.getPlaylistTracks(user, pid, offset + 100);
            });
    },
    search: function(artist, album, track){
        var query = track + (artist ? ' artist:'+artist : '') + (album ? ' album:' + album : '');
        spotifyApi.search(query, ['track'], { limit: 50 }, function(err, data){
            S.store('search', data.tracks);
        });
    }
}

S.handlers = {
    playlistClick: function($p, id, index){
        $p.click(function(){
            S.ui.openPlaylist(id, index);
        });
    },
    newPlaylistSubmit: function($f){
        $f.submit(function(e){
            e.preventDefault();
            var name = $f.find('input[name=name]').val();
            if(name){
                S.fn.createPlaylist(name, $f.find('input[name=public]').prop('checked'), 'created by Spleed');
            }
        })
    },
    trackMouseout: function($t, cls){
        $t.mouseout(function(){
            $t.removeClass('show' + cls);
        })
    },
    trackClick: function($t, cls){
        $t.click(function(){
            $t.addClass('show' + cls);
        })
    },
    playClick: function($t, $p, track){
        $p.click(function(){
            $t.addClass('playing');
            spotifyApi.play({uris:[track.uri]});
        });
    },
    pauseClick: function($t, $p, track){
        $p.click(function(){
            $t.removeClass('playing');
            spotifyApi.pause({});
        });
    },
    addTrackClick: function($t, $a, track){
        $a.click(function(){
            spotifyApi.addTracksToPlaylist(S.store('user').id, S.data.CURRENT_PLAYLIST, [track.uri], function(err, data){
                if(!err){
                    $t.addClass('added');
                    //$('.playlist-counter').text(parseInt($('.playlist-counter').text())+1);
                    var tracks = S.store('tracks');
                    tracks.items.push({track:track});
                    tracks.total = tracks.items.length;
                    S.store('tracks', tracks);
                }
            });
        })
    },
    addToOthersClick: function($t, $d, track){
        $d.click(function(){
            $t.addClass('showOthers');
            S.ui.showOtherPlaylists($t, track);
        });
    },
    addToOtherClick: function($e, $a, playlist, track){
        $a.click(function(){
            spotifyApi.addTracksToPlaylist(S.store('user').id, playlist.id, [track.uri], function(err, data){
                if(!err){
                    $e.addClass('added');
                }
            });
        });
    },
    removeTrackClick: function($t, $r, track, i){
        $r.click(function(){
            spotifyApi.removeTracksFromPlaylist(S.store('user').id, S.data.CURRENT_PLAYLIST, [track.uri], function(err, data){
                if(!err){
                    $('#track_'+track.id).remove();
                    //$('.playlist-counter').text(parseInt($('.playlist-counter').text())-1);
                    var tracks = S.store('tracks');
                    tracks.items.splice(i, 1);
                    tracks.total = tracks.items.length;
                    S.store('tracks', tracks);
                }
            });
        })
    },
    backClick: function($p){
        $p.click(function(){
            S.data.CURRENT_PLAYLIST = null;
            S.data.CURRENT_TRACKS = {};
            $('#playlist').hide();
            $('#playlists').show();
        });
    },
    searchChange: function($p, $s){
        var $searchA = $p.find('.search-form input[name=artist]');
        var $searchD = $p.find('.search-form input[name=album]');
        var $searchT = $p.find('.search-form input[name=track]');
        $s.keypress(function(){
            if(S.timeouts.searchTimeout){
                clearTimeout(S.timeouts.searchTimeout);
            }
            S.timeouts.searchTimeout = setTimeout(function(){
                S.fn.search($searchA.val(), $searchD.val(), $searchT.val())
            }, 500);
        });
    }
}









var spotifyApi = new SpotifyWebApi();

$(document).ready(function(){

    $('#loginButton').attr('href', $('#loginButton').attr('href') + 'from='+S.SOURCE+'&_t=' + new Date().getTime());

    S.ui.loggingIn(true);

    var code = S.utils.getUrlParameter('code');
    var accessToken = S.storage.get('accessToken');
    if(accessToken && !code){
        if(!accessToken.timestamp || new Date().getTime()>=accessToken.timestamp+accessToken.expires_in*1000){
            S.store('user', {});
            S.storage.set('accessToken', null);
        } else {
            S.fn.login(accessToken);
            S.ui.init();
        }
    } else if(code){
        $.post(S.FUNCTIONS_URL + 'getAccessToken', { code: code, from: S.SOURCE }, function(response){
            S.fn.login(response);
            S.utils.cleanUrl();
            S.ui.init();
        });
    } else {
        S.ui.loggingIn(false);
    }

    $('#logout').click(function(){
        S.store('user', {});
        S.store('playlists',{});
        S.store('search',{});
        S.store('tracks',{});
        S.storage.set('accessToken', null);
    });



});
