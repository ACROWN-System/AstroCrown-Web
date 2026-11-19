(function () {
  "use strict";
  var root=document.getElementById("community-network");
  if(!root)return;
  var $=function(id){return document.getElementById(id);};
  var make=function(tag,cls,text){
    var node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined&&text!==null)node.textContent=String(text);
    return node;
  };
  var state={authenticated:false,spaces:[],slug:null,community:null,items:[],cursor:null,busy:false};
  var feed=$("community-feed-list"),spaceList=$("community-space-list"),composer=$("community-composer-form"),
      loginPrompt=$("community-login-prompt"),feedback=$("community-feedback"),
      invitations=$("community-invitations-panel"),queue=$("community-manager-queue");

  function announce(text,kind){
    feedback.textContent=text||"";
    feedback.dataset.kind=kind||"info";
    feedback.hidden=!text;
  }
  async function api(path,payload){
    var response;
    try{
      response=await fetch(path,{method:payload===undefined?"GET":"POST",credentials:"same-origin",cache:"no-store",
        headers:payload===undefined?{Accept:"application/json"}:{Accept:"application/json","Content-Type":"application/json"},
        body:payload===undefined?undefined:JSON.stringify(payload)});
    }catch(_error){throw new Error("The community service could not be reached. No change was made.");}
    var data;
    try{data=await response.json();}catch(_error){throw new Error("The community service returned an unreadable response.");}
    if(!response.ok)throw new Error(data.error||"The community request could not be completed.");
    return data;
  }
  function openAccount(){
    var button=$("open-account-dialog");
    if(button)button.click();
  }
  function formatTime(value){
    var date=new Date(Number(value)*1000);
    return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(date):"Time unavailable";
  }
  function updateComposer(){
    var canPost=state.authenticated&&(!state.community||state.community.membershipStatus==="active");
    composer.hidden=!canPost;
    loginPrompt.hidden=canPost;
    var copy=loginPrompt.querySelector("[data-community-login-copy]");
    if(copy){
      copy.textContent=!state.authenticated
        ?"Log in with your AstroCrown passkey to publish, react, reply, bookmark or report."
        :state.community&&state.community.membershipStatus==="pending"
          ?"Your membership request is awaiting a community manager."
          :"Join this community before publishing a post here.";
    }
  }
  function renderSpaces(){
    spaceList.replaceChildren();
    state.spaces.forEach(function(space){
      var button=make("button","community-space-button");
      button.type="button";
      button.dataset.communitySlug=space.slug;
      button.setAttribute("aria-current",state.slug===space.slug?"true":"false");
      var copy=make("span","community-space-copy");
      copy.appendChild(make("span","community-space-name",space.name));
      copy.appendChild(make("span","community-space-note",space.membershipPolicy==="request"?"Membership by request":"Open membership"));
      button.appendChild(copy);
      button.appendChild(make("span","community-space-count",space.memberCount));
      spaceList.appendChild(button);
    });
  }
  function renderHeader(){
    var title=$("community-space-heading"),description=$("community-space-description"),
        meta=$("community-space-meta"),memberAction=$("community-member-action"),
        reviewButton=$("community-review-requests");
    if(!state.community){
      title.textContent="Community-wide feed";
      description.textContent="A shared view of posts published to AstroCrown's open social feed.";
      meta.textContent="Global posts · "+state.items.length+" loaded";
      memberAction.hidden=true;
      reviewButton.hidden=true;
      queue.hidden=true;
      return;
    }
    var space=state.community;
    title.textContent=space.name;
    description.textContent=space.description||space.purpose||"";
    meta.textContent=space.memberCount+" members · "+(space.visibility==="restricted"?"Restricted":"Public")+
      " · "+(space.membershipPolicy==="request"?"Request to join":"Open membership");
    memberAction.hidden=!state.authenticated;
    reviewButton.hidden=!state.authenticated||!["owner","moderator"].includes(space.memberRole)||space.membershipPolicy!=="request";
    if(space.membershipStatus==="active"){
      memberAction.textContent=space.memberRole==="owner"?"Community owner":"Leave community";
      memberAction.disabled=space.memberRole==="owner";
      memberAction.dataset.communityAction="leave";
    }else if(space.membershipStatus==="pending"){
      memberAction.textContent="Cancel request";
      memberAction.disabled=false;
      memberAction.dataset.communityAction="leave";
    }else{
      memberAction.textContent=space.membershipPolicy==="request"?"Request to join":"Join community";
      memberAction.disabled=false;
      memberAction.dataset.communityAction="join";
    }
    if(reviewButton.hidden)queue.hidden=true;
  }
  function renderPost(post){
    var article=make("article","community-post");
    article.dataset.postId=post.id;
    var header=make("div","community-post-header");
    var author=make("div","community-post-author");
    author.appendChild(make("span","",post.author&&post.author.handle||"AstroCrown member"));
    if(post.community)author.appendChild(make("small","","in "+post.community.name));
    header.appendChild(author);
    header.appendChild(make("time","community-post-time",formatTime(post.createdAt)));
    article.appendChild(header);
    article.appendChild(make("p","community-post-content",post.content));

    var actions=make("div","community-post-actions");
    var like=make("button","community-button",(post.likedByViewer?"Liked":"Like")+" · "+post.likeCount);
    like.type="button";like.dataset.postAction="like";like.setAttribute("aria-pressed",post.likedByViewer?"true":"false");actions.appendChild(like);
    var replies=make("button","community-button","Replies · "+post.replyCount);
    replies.type="button";replies.dataset.postAction="replies";actions.appendChild(replies);
    var bookmark=make("button","community-button",post.bookmarkedByViewer?"Saved":"Save");
    bookmark.type="button";bookmark.dataset.postAction="bookmark";bookmark.setAttribute("aria-pressed",post.bookmarkedByViewer?"true":"false");actions.appendChild(bookmark);
    var report=make("button","community-button","Report");
    report.type="button";report.dataset.postAction="report";actions.appendChild(report);
    article.appendChild(actions);

    var replyDetails=make("details","community-replies");
    replyDetails.appendChild(make("summary","","View replies and add a response"));
    var replyList=make("div","community-replies-body");replyList.dataset.repliesBody="true";replyDetails.appendChild(replyList);
    var replyForm=make("form","community-reply-form");replyForm.dataset.replyForm=post.id;
    var replyInput=make("input","community-input");replyInput.name="content";replyInput.maxLength=10000;replyInput.placeholder="Write a reply…";replyInput.setAttribute("aria-label","Reply text");replyForm.appendChild(replyInput);
    var replySubmit=make("button","community-button is-primary","Reply");replySubmit.type="submit";replyForm.appendChild(replySubmit);
    replyDetails.appendChild(replyForm);
    replyDetails.addEventListener("toggle",function(){if(replyDetails.open&&replyList.dataset.loaded!=="true")loadReplies(post.id,replyList);});
    article.appendChild(replyDetails);

    var reportForm=make("form","community-report-form");reportForm.hidden=true;reportForm.dataset.reportForm=post.id;
    var categoryWrap=make("div");categoryWrap.appendChild(make("label","","Reason"));
    var category=make("select","community-select");category.name="category";
    ["spam","harassment","impersonation","privacy","illegal","other"].forEach(function(value){
      var option=make("option","",value.charAt(0).toUpperCase()+value.slice(1));option.value=value;category.appendChild(option);
    });
    categoryWrap.appendChild(category);reportForm.appendChild(categoryWrap);
    var contextWrap=make("div");contextWrap.appendChild(make("label","","Additional context (optional)"));
    var context=make("input","community-input");context.name="details";context.maxLength=1000;context.placeholder="Avoid personal information";contextWrap.appendChild(context);reportForm.appendChild(contextWrap);
    var submitReport=make("button","community-button is-danger","Submit report");submitReport.type="submit";reportForm.appendChild(submitReport);
    article.appendChild(reportForm);
    return article;
  }
  function renderFeed(){
    feed.replaceChildren();
    if(!state.items.length){
      var empty=make("div","community-empty");
      empty.appendChild(make("strong","","No posts here yet."));
      empty.appendChild(make("p","",state.community?"Be the first active member to start a discussion.":"The shared AstroCrown feed is ready for its first post."));
      feed.appendChild(empty);
    }else state.items.forEach(function(post){feed.appendChild(renderPost(post));});
    if(state.cursor){
      var more=make("div","community-empty"),button=make("button","community-button","Load older posts");
      button.type="button";button.dataset.communityAction="more";more.appendChild(button);feed.appendChild(more);
    }
  }
  async function loadFeed(append){
    if(state.busy)return;
    state.busy=true;
    var refresh=$("community-refresh");refresh.disabled=true;
    try{
      var path=state.slug?"/api/community/communities/"+encodeURIComponent(state.slug)+"/feed":"/api/community/feed";
      var suffix="?limit=20"+(append&&state.cursor?"&cursor="+encodeURIComponent(state.cursor):"");
      var page=await api(path+suffix);
      state.items=append?state.items.concat(page.items||[]):(page.items||[]);
      state.cursor=page.nextCursor||null;
      renderFeed();renderHeader();
    }catch(error){
      if(!append){state.items=[];state.cursor=null;renderFeed();}
      announce(error.message,"error");
    }finally{state.busy=false;refresh.disabled=false;}
  }
  async function loadCommunity(slug){
    state.slug=slug||null;state.community=null;state.items=[];state.cursor=null;renderSpaces();
    if(!state.slug){
      renderHeader();updateComposer();await loadFeed(false);return;
    }
    try{
      state.community=await api("/api/community/communities/"+encodeURIComponent(state.slug));
      renderHeader();updateComposer();await loadFeed(false);
      if(!state.community.canViewPosts)announce("You can view this overview, but posts are limited to active members.","info");
    }catch(error){
      renderHeader();updateComposer();announce(error.message,"error");
      feed.replaceChildren(make("div","community-empty","This community is not available to your account."));
    }
  }
  async function refreshSpaces(){
    var result=await api("/api/community/communities");
    state.spaces=Array.isArray(result.communities)?result.communities:[];
    renderSpaces();
  }
  async function refreshAccount(){
    try{var status=await api("/api/account/status");state.authenticated=status.authenticated===true;}
    catch(_error){state.authenticated=false;}
    if(!state.authenticated){invitations.hidden=true;queue.hidden=true;}
    updateComposer();renderHeader();
  }
  async function loadReplies(postId,target){
    try{
      var result=await api("/api/community/posts/"+encodeURIComponent(postId)+"/replies?limit=30");
      target.replaceChildren();
      (result.items||[]).forEach(function(reply){
        var block=make("div","community-reply");
        block.appendChild(make("strong","",reply.author&&reply.author.handle||"AstroCrown member"));
        block.appendChild(make("p","",reply.content));
        target.appendChild(block);
      });
      if(!result.items||!result.items.length)target.appendChild(make("p","community-panel-description","No replies yet."));
      target.dataset.loaded="true";
    }catch(error){target.replaceChildren(make("p","community-panel-description",error.message));}
  }
  async function loadRequests(){
    if(!state.slug)return;
    try{
      var result=await api("/api/community/communities/"+encodeURIComponent(state.slug)+"/membership-requests");
      queue.replaceChildren(make("h4","","Pending membership requests"));
      if(!result.items.length)queue.appendChild(make("p","community-panel-description","No pending requests."));
      (result.items||[]).forEach(function(request){
        var row=make("div","community-request-row");
        row.appendChild(make("p","",request.handle+" · requested "+formatTime(request.requestedAt)));
        var actions=make("div","community-panel-actions");
        ["approve","reject"].forEach(function(decision){
          var button=make("button","community-button"+(decision==="reject"?" is-danger":" is-primary"),decision==="approve"?"Approve":"Reject");
          button.type="button";button.dataset.decision=decision;button.dataset.accountId=request.accountId;actions.appendChild(button);
        });
        row.appendChild(actions);queue.appendChild(row);
      });
      queue.hidden=false;
    }catch(error){announce(error.message,"error");}
  }
  async function loadInvitations(){
    if(!state.authenticated){announce("Log in with your AstroCrown passkey to view invitations.");return;}
    try{
      var result=await api("/api/community/invitations");
      invitations.replaceChildren(make("h4","","Community invitations"));
      if(!result.invitations.length)invitations.appendChild(make("p","community-panel-description","You have no pending community invitations."));
      (result.invitations||[]).forEach(function(invite){
        var row=make("div","community-invitation"),copy=make("p","",invite.communityName);
        copy.appendChild(make("small","", "Invited by "+invite.inviterHandle+" · expires "+formatTime(invite.expiresAt)));
        row.appendChild(copy);
        var actions=make("div","community-panel-actions");
        ["accept","decline"].forEach(function(action){
          var button=make("button","community-button"+(action==="accept"?" is-primary":""),action==="accept"?"Accept":"Decline");
          button.type="button";button.dataset.invitationAction=action;button.dataset.invitationId=invite.id;button.dataset.invitationSlug=invite.slug;actions.appendChild(button);
        });
        row.appendChild(actions);invitations.appendChild(row);
      });
      invitations.hidden=false;
    }catch(error){announce(error.message,"error");}
  }
  root.addEventListener("click",async function(event){
    var target=event.target;
    if(!target||typeof target.closest!=="function")return;
    var space=target.closest("[data-community-slug]");
    if(space){await loadCommunity(space.dataset.communitySlug);return;}
    if(target.closest("#community-global-feed")){await loadCommunity(null);return;}
    var action=target.closest("[data-community-action]");
    if(action){
      var type=action.dataset.communityAction;
      if(type==="login"){openAccount();return;}
      if(type==="refresh"){try{await refreshSpaces();await loadCommunity(state.slug);announce("Community data refreshed.","success");}catch(error){announce(error.message,"error");}return;}
      if(type==="invitations"){await loadInvitations();return;}
      if(type==="review"){await loadRequests();return;}
      if(type==="more"&&state.cursor){await loadFeed(true);return;}
      if((type==="join"||type==="leave")&&state.slug){
        if(!state.authenticated){openAccount();return;}
        try{
          var result=await api("/api/community/communities/"+encodeURIComponent(state.slug)+"/"+type,{});
          await refreshSpaces();await loadCommunity(state.slug);
          announce(result.membershipStatus==="pending"?"Membership request submitted.":type==="join"?"You joined the community.":"You left the community.","success");
        }catch(error){announce(error.message,"error");}
        return;
      }
    }
    var postAction=target.closest("[data-post-action]");
    if(postAction){
      var card=postAction.closest("[data-post-id]");
      var post=state.items.find(function(item){return item.id===card.dataset.postId;});
      if(!post)return;
      if(!state.authenticated){openAccount();return;}
      try{
        var kind=postAction.dataset.postAction;
        if(kind==="like")await api("/api/community/posts/"+encodeURIComponent(post.id)+"/reactions",{reaction:post.likedByViewer?null:"like"});
        else if(kind==="bookmark")await api("/api/community/posts/"+encodeURIComponent(post.id)+"/bookmark",{});
        else if(kind==="replies"){var details=card.querySelector(".community-replies");details.open=!details.open;return;}
        else if(kind==="report"){var report=card.querySelector("[data-report-form]");report.hidden=!report.hidden;return;}
        await loadFeed(false);
      }catch(error){announce(error.message,"error");}
      return;
    }
    var decision=target.closest("[data-decision]");
    if(decision){
      try{await api("/api/community/communities/"+encodeURIComponent(state.slug)+"/members/"+encodeURIComponent(decision.dataset.accountId)+"/decision",{action:decision.dataset.decision});await loadRequests();await refreshSpaces();}
      catch(error){announce(error.message,"error");}
      return;
    }
    var invitation=target.closest("[data-invitation-action]");
    if(invitation){
      try{
        await api("/api/community/invitations/"+encodeURIComponent(invitation.dataset.invitationId)+"/respond",{action:invitation.dataset.invitationAction});
        if(invitation.dataset.invitationAction==="accept"){await refreshSpaces();await loadCommunity(invitation.dataset.invitationSlug);announce("You joined the private community.","success");}
        await loadInvitations();
      }catch(error){announce(error.message,"error");}
    }
  });
  root.addEventListener("submit",async function(event){
    var form=event.target;
    if(form.id==="community-composer-form"){
      event.preventDefault();
      if(!state.authenticated){openAccount();return;}
      var input=$("community-compose-text"),value=input.value.trim();
      if(!value){announce("Write a post before publishing.","error");input.focus();return;}
      var payload={content:value};if(state.slug)payload.communitySlug=state.slug;
      try{await api("/api/community/posts",payload);input.value="";announce("Your post was published.","success");await loadFeed(false);}
      catch(error){announce(error.message,"error");}
      return;
    }
    if(form.matches("[data-reply-form]")){
      event.preventDefault();
      if(!state.authenticated){openAccount();return;}
      var valueReply=form.elements.content.value.trim();if(!valueReply)return;
      try{
        await api("/api/community/posts/"+encodeURIComponent(form.dataset.replyForm)+"/replies",{content:valueReply});
        form.reset();
        var target=form.closest(".community-replies").querySelector("[data-replies-body]");
        target.dataset.loaded="false";await loadReplies(form.dataset.replyForm,target);await loadFeed(false);
      }catch(error){announce(error.message,"error");}
      return;
    }
    if(form.matches("[data-report-form]")){
      event.preventDefault();
      if(!state.authenticated){openAccount();return;}
      try{
        await api("/api/community/posts/"+encodeURIComponent(form.dataset.reportForm)+"/report",{category:form.elements.category.value,details:form.elements.details.value});
        form.reset();form.hidden=true;announce("Your report was submitted for moderation.","success");
      }catch(error){announce(error.message,"error");}
    }
  });
  document.addEventListener("astrocrown:account-status-change",function(event){
    state.authenticated=Boolean(event.detail&&event.detail.authenticated);
    if(!state.authenticated){invitations.hidden=true;queue.hidden=true;}
    updateComposer();renderHeader();
    if(state.authenticated)refreshSpaces().then(function(){return state.slug?loadCommunity(state.slug):loadFeed(false);})
      .catch(function(error){announce(error.message,"error");});
  });
  $("community-invitations-button").addEventListener("click",loadInvitations);
  $("community-review-requests").addEventListener("click",loadRequests);
  $("community-refresh").addEventListener("click",async function(){
    try{await refreshSpaces();await loadCommunity(state.slug);announce("Community data refreshed.","success");}
    catch(error){announce(error.message,"error");}
  });
  document.addEventListener("visibilitychange",function(){
    if(!document.hidden&&root.getBoundingClientRect().top<window.innerHeight){
      refreshAccount();refreshSpaces().then(renderSpaces).catch(function(){});
    }
  });
  async function initialize(){
    await refreshAccount();
    try{await refreshSpaces();await loadCommunity(null);}
    catch(error){announce(error.message,"error");feed.replaceChildren(make("div","community-empty","The community network is unavailable in this environment."));}
  }
  initialize();
})();