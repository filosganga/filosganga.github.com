---
layout: post
category : utilities
tags : [java, REST, filter]
---
{% include JB/setup %}
The actual trend of developing application based on REST service can find an obstacle in the proxy and firewall 
configurations. Most of these drops requests other than GET and POST. The best practices of REST API design involve 
the use of all HTTP method to describe the action, rather than changing the URI. The URI should identify the 
resources nor the actions.

An URI as `http://example.com/users/delete/6` is a very bad example of REST API implementation. It should be
`http://example.com/users/6` and handle the DELETE method to remove the user with id `6`.

A smart solution to keep the API clean, is overriding the original method with one specified in a request header. So a 
POST method can act as PUT or DELETE method adding a known header to the request. The `X-HTTP-Method-Override` is the 
header that is used to to that

##The java sourcecode:
{% highlight java %}

	/**
	 *
	 * @author Filippo De Luca
	 *
	 * @version $Id$
	 */
	public class MethodOverrideFilter implements Filter {
	
		public static final String HEADER_PARAM = "methodOverrideHeader";
		
		public static final String DEFAULT_HEADER = "X-HTTP-Method-Override";
		
		private String header = DEFAULT_HEADER;
		
		public void init(FilterConfig filterConfig) throws ServletException {
		
		    header = filterConfig.getInitParameter(HEADER_PARAM);
		    if(StringUtils.isBlank(header)) {
		      header = DEFAULT_HEADER;
		    }
		
		}
		
		public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
		
			ServletRequest filteredRequest = request;
			
			if(request instanceof HttpServletRequest) {
			
			  HttpServletRequest httpRequest = (HttpServletRequest)request;
			  filteredRequest = new MethodOverrideHttpServletRequestDecorator(
				httpRequest, 
				header
			  );
			}
			
			chain.doFilter(filteredRequest, response);
		}
	
		public void destroy() {
			// Empty
		}
	
		private class MethodOverrideHttpServletRequestDecorator extends HttpServletRequestWrapper {
		
			public static final String DEFAULT_HEADER = "X-HTTP-Method-Override";
			
			private final String methodOverrideHeader;
			
			private transient String method;
			
			public MethodOverrideHttpServletRequestDecorator(HttpServletRequest request, String methodOverrideHeader) {
				super(request);
				this.methodOverrideHeader = methodOverrideHeader;
			}
			
			@Override
			public String getMethod() {
			
				if(method==null) {
					method = resolveMethod();
				}
				
				return method;
			}
			
			protected String resolveMethod() {
			
				String headerValue = getHeader(methodOverrideHeader);
				
				if(headerValue!=null) {
					return headerValue;
				}
				else {
					return super.getMethod();
				}
			}
		
		}
	}

{% endhighlight %}

The source is hosted at [this gist](https://gist.github.com/923414).
