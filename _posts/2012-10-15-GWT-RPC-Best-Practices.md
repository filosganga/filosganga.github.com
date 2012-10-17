---
layout: post
title :  GWT RPC Best Practices
category : programming
tags : [java, GWT, best-practices]
---
{% include JB/setup %}
The Google Web Toolkit (GWT) allows you write plain java code, to be translated
in client-side javascript code. Permit you to reuse your domain objects in the 
client side. This promise is very amazing, but it isn't the whole true, using 
GWT without be aware of the transformation can produce a poor performance and, 
worst, unmaintainable project with disastrous results for your business.

I would like to spend some time to write few posts about the best practices I 
have learnt using GWT and which common pitfalls to avoid.

When I have started to use GWT the first problem I have encountered is the 
development of the RPC Service:
 
1. They need to have two interfaces.
2. They should be plain java Servlet.
3. The serialization of objects is a pain.
4. Their interface should not follow the java common best practices. 

About the `1` it is solvable using the `maven-gwt-plugin`, it will generate the 
Async interface (It doesn't work well with generics actually) for you as well 
the Servlet mapping on the `web.xml` descriptor.

The drawbacks of the `2` instead is that if you are using Spring, the Servlet 
are instantiated outside the Spring context you cannot apply any aspect on them.
(can not be transaction for example). If you want the GWT service to be live 
inside Spring you need to create two instance for the same interface:

* A Spring bean
* A Servlet delegating all method to the Spring bean.

This is a possible implementation of that:
{% highlight java %}
public abstract class GWTService {

    protected HttpServletRequest currentRequest() {
        return GWTThreadLocals.instance().getRequest();
    }

    protected HttpServletResponse currentResponse() {
        return GWTThreadLocals.instance().getResponse();
    }
}

public final class GWTThreadLocals {

    private static final GWTThreadLocals INSTANCE = new GWTThreadLocals();

    protected ThreadLocal<HttpServletRequest> perThreadRequest;
    protected ThreadLocal<HttpServletResponse> perThreadResponse;

    private GWTThreadLocals() {
        perThreadRequest = new ThreadLocal<HttpServletRequest>();
        perThreadResponse = new ThreadLocal<HttpServletResponse>();
    }

    public static GWTThreadLocals instance() {
        return INSTANCE;
    }

    public void setRequest(HttpServletRequest request) {
        perThreadRequest.set(request);
    }

    public HttpServletRequest getRequest() {
        return perThreadRequest.get();
    }

    public void setResponse(HttpServletResponse response) {
        perThreadResponse.set(response);
    }

    public HttpServletResponse getResponse() {
        return perThreadResponse.get();
    }
}

public abstract class GWTRemoteServiceServlet extends RemoteServiceServlet {

    @Override
    protected void onBeforeRequestDeserialized(String serializedRequest) {
        super.onBeforeRequestDeserialized(serializedRequest);
        setGwtThreadLocals();
    }

    protected void setGwtThreadLocals() {
        GWTThreadLocals.instance().setRequest(getThreadLocalRequest());
        GWTThreadLocals.instance().setResponse(getThreadLocalResponse());
    }
}
{% endhighlight %}

So if we have a GWT service interface to implement, we have to extend 
{{GWTService}} and implement our interface. Then put this implementation in the
Spring context. We have then to create our Servlet extending {{GWTRemoteServiceServlet}}
implementing the same interface and delegating all method to the Spring bean.

This is the example for a {{ContactService}} interface:
{% highlight java %}
@RemoteServiceRelativePath("ContactService")
public interface ContactService extends RemoteService {

  ArrayList<Contact> findByName(String name);

}

@Service("contactService")
public class ContactServiceImpl extends GWTService implements ContactService {


    @Override
    @Transactional(readOnly = true)
    public ArrayList<Contact> findByName(String name) {

       // Implementation calling the DB or whatever do you want
       return new ArrayList<Contact>();
    }
}

public class ContactServiceServlet extends GWTServiceServlet implements ContactService {

    private ContactService delegate;

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        delegate = getRequiredWebApplicationContext(config.getServletContext()).getBean(ContactService.class);
    }


    @Override
    public ArrayList<Contact> findByName(String name) {
       // Call the delegate implementation
       return delegate.findByName(name);
    }
}
{% endhighlight %}

Writing this code for each service is very boring job of course, but your IDE 
can do it for you.

How you can notice the {{ContactInterface}} expose the {{ArrayList}} concrete type
instead of the {{List}} interface. It is about the `4`, exposing {{List}} makes
GWT creating one snipped of code for each possible implementation of {{List}}. This
will generate a oversize codebase and a longer compilation time. Indeed it is against
any Java common best practice, but you have to keep in mind that GWT is not Java.

About the serialization of object:

* They should implement Serializable or IsSerializable
* They should have an empty default constructor
* All transient or final(so crazy) fields will be ignored.
* All dependent object should follow the same rules.

Of course GWT should know the codebase of the type for each dependent not final/transient
field. The trick is put the source as dependency of the maven module contains the GWT plugin.
However it is not enough because not all standard java classes are supported (no Calendar for example),
so also if you include a lib source code, unlikely will be supported. Some libs offers a separate
module for the GWT support, as Google Guava does. But they are not so common. Alternatively you
can write the serialization for a particular class yourself. However is not so trivial.

How we have seen there is no simple solutions for the `4`, having a serializable object, is 
complex and unlikely good integrated in our domain. If for example we are using Hibernate as
ORM, serializing an Hibernate entity is the worst thing you can do. It will serialize your whole
DB in the worst case. However in many case you have to deep copy the object because GWT is not
able to serialize the Hibernate custom collections. And usually you don't need them in client side.

At the end using GWT RPC require to write a GWT service layer with its own domain
objects. They will likely contain already preprocessed data, like the formatted date
(no joda time on GWT, neither Calendar). At the end of the day, the promise to use 
your domain object in the client side is a lie.

In the next post I will describe a way to use a JSON REST api with GWT.

The complete code is available at [GWT RPC Spring Scaffolding gist](https://gist.github.com/3902429).


